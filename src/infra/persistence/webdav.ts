/* =========================================================
   蚀月远征 · 星海驿站（WebDAV 同步客户端）
   在星海中寻一处驿站（WebDAV 目录），让月光烙记以残卷之形
   往返于两轮月亮之间 —— 寄月（上传）/ 收月（下载）/ 潮汐（自动同步）。
   驿站地址与信物（凭据）存于月痕，不随残卷带走。
   ========================================================= */

import { exportFullSave, importFullSave, parseArchive, localExportedAt } from './archive.js';

/* ---------- 驿站配置 ---------- */
const SYNC_CFG_KEY = 'eclipse_sync_config_v1';
const SYNC_META_KEY = 'eclipse_sync_meta_v1';

/** 残卷在驿站中的文件名 */
export const SYNC_FILE = 'eclipse_save.json';

export interface WebdavConfig {
  url: string;
  username: string;
  password: string;
}

interface SyncMeta {
  /** 上次从驿站看到远端残卷的拓印时间 */
  lastRemoteAt: number;
  /** 上次同步完成后的共同基线指纹 —— 同步完成后本地与远端内容一致，
   *  据此判断任一侧是否自上次同步后有改动（时间戳受设备时钟偏差影响，不可作判定依据） */
  lastFingerprint: string;
}

export type SyncStatus = 'ok' | 'no-remote' | 'conflict' | 'error' | 'not-configured';

export interface SyncResult {
  status: SyncStatus;
  /** 世界观化描述（供 UI 直接展示） */
  message: string;
  /** 是否实际写回了本地存档 */
  applied: boolean;
  remoteAt?: number;
  localAt?: number;
}

/* ---------- 配置读写 ---------- */

/** 密语混淆：前缀标记算法版本，便于将来升级混淆方案 */
const OBF_PREFIX = 'obf1:';
/** 混淆盐（固定于客户端代码，仅作防明文落盘，非加密） */
const OBF_SALT = '蚀月远征·星海驿站·守月人密语';

/** UTF-8 字节 → base64（密语含中文/特殊字符时安全） */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** base64 → UTF-8 字节 */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 混淆：逐字节 XOR 盐，输出带前缀的 base64 */
function obfuscate(plain: string): string {
  const data = new TextEncoder().encode(plain);
  const salt = new TextEncoder().encode(OBF_SALT);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ salt[i % salt.length];
  return OBF_PREFIX + bytesToBase64(out);
}

/** 还原：接受带前缀的新格式；不带前缀视为旧明文（向后兼容，直接原样返回） */
function deobfuscate(encoded: string): string {
  if (!encoded.startsWith(OBF_PREFIX)) return encoded;
  const data = base64ToBytes(encoded.slice(OBF_PREFIX.length));
  const salt = new TextEncoder().encode(OBF_SALT);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ salt[i % salt.length];
  return new TextDecoder().decode(out);
}

export function loadWebdavConfig(): WebdavConfig | null {
  try {
    const raw = localStorage.getItem(SYNC_CFG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<WebdavConfig>;
    if (typeof c.url !== 'string' || !c.url || typeof c.username !== 'string' || typeof c.password !== 'string') {
      return null;
    }
    // 读回时还原为明文（供 Basic 鉴权头使用）；存储层始终为混淆态
    return { url: c.url, username: c.username, password: deobfuscate(c.password) };
  } catch {
    return null;
  }
}

export function saveWebdavConfig(cfg: WebdavConfig): void {
  try {
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify({
      url: cfg.url.trim(),
      username: cfg.username,
      password: obfuscate(cfg.password),
    }));
  } catch {
    /* 写盘失败静默 */
  }
}

export function clearWebdavConfig(): void {
  try {
    localStorage.removeItem(SYNC_CFG_KEY);
  } catch {
    /* 静默 */
  }
}

/* ---------- 元数据 ---------- */
function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as Partial<SyncMeta>;
      return { lastRemoteAt: typeof m.lastRemoteAt === 'number' ? m.lastRemoteAt : 0, lastFingerprint: typeof m.lastFingerprint === 'string' ? m.lastFingerprint : '' };
    }
  } catch {
    /* 回退默认 */
  }
  return { lastRemoteAt: 0, lastFingerprint: '' };
}

function saveMeta(m: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(m));
  } catch {
    /* 静默 */
  }
}

/** 本地拓印指纹：仅基于稳定的"内容"（v + domains），剥离 exportedAt 等时间戳字段
 * —— 同一份存档无论何时拓印，只要内容没变，指纹就一致。 */
function fingerprint(archiveJson: string): string {
  try {
    const obj = JSON.parse(archiveJson) as { v?: number; exportedAt?: number; domains?: unknown };
    const stable = JSON.stringify({ v: obj?.v, domains: obj?.domains ?? {} });
    let h = 0x811c9dc5;
    for (let i = 0; i < stable.length; i++) {
      h ^= stable.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  } catch {
    /* 解析失败时回退到全串哈希 */
    let h = 0x811c9dc5;
    for (let i = 0; i < archiveJson.length; i++) {
      h ^= archiveJson.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }
}

/* ---------- 基础 WebDAV 请求 ---------- */
function authHeader(cfg: WebdavConfig): string {
  return 'Basic ' + base64(`${cfg.username}:${cfg.password}`);
}

/** UTF-8 安全的 base64（btoa 对非 Latin1 会抛错） */
function base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** 拼接驿站文件完整地址：url（保证以 / 结尾）+ 残卷文件名 */
function fileUrl(cfg: WebdavConfig): string {
  const base = cfg.url.endsWith('/') ? cfg.url : cfg.url + '/';
  return base + SYNC_FILE;
}

/** 驿站目录地址（MKCOL 目标） */
function dirUrl(cfg: WebdavConfig): string {
  return cfg.url.endsWith('/') ? cfg.url : cfg.url + '/';
}

function headers(cfg: WebdavConfig, extra?: Record<string, string>): Record<string, string> {
  return { Authorization: authHeader(cfg), ...extra };
}

async function request(cfg: WebdavConfig, method: string, path: string, body?: string | null, extra?: Record<string, string>): Promise<Response> {
  return fetch(path, {
    method,
    headers: headers(cfg, body !== undefined ? { 'Content-Type': 'application/json', ...extra } : extra),
    body: body === undefined || body === null ? undefined : body,
  });
}

/** 探测驿站连通性（OPTIONS 或 GET，任一收到 HTTP 应答即视为可达；
 *  仅网络层失败（fetch 抛错）才视为不可达 —— 501/5xx 说明驿站仍应答了） */
export async function probeWebdav(cfg: WebdavConfig): Promise<boolean> {
  try {
    await request(cfg, 'OPTIONS', dirUrl(cfg));
    return true;
  } catch {
    try {
      await request(cfg, 'GET', dirUrl(cfg));
      return true;
    } catch {
      return false;
    }
  }
}

/** 尝试创建驿站目录（已存在则忽略） */
async function ensureDir(cfg: WebdavConfig): Promise<void> {
  try {
    await request(cfg, 'MKCOL', dirUrl(cfg));
  } catch {
    /* 目录可能已存在或服务器不支持 MKCOL，由 PUT 自行兜底 */
  }
}

/* ---------- 同步动作 ---------- */

/** 寄月：将本地完整存档拓印上传至驿站 */
export async function pushToWebdav(cfg: WebdavConfig): Promise<SyncResult> {
  const archive = exportFullSave();
  const parsed = parseArchive(archive);
  const localAt = parsed.ok && parsed.archive ? parsed.archive.exportedAt : 0;
  try {
    await ensureDir(cfg);
    const res = await request(cfg, 'PUT', fileUrl(cfg), archive);
    if (res.status >= 200 && res.status < 300) {
      saveMeta({ lastRemoteAt: localAt, lastFingerprint: fingerprint(archive) });
      return { status: 'ok', message: '月光已寄往星海，驿站收讫', applied: false, localAt };
    }
    return { status: 'error', message: `驿站拒收（HTTP ${res.status}）`, applied: false, localAt };
  } catch {
    return { status: 'error', message: '星海无应答，寄月失败', applied: false, localAt };
  }
}

/** 收月：从驿站拉取残卷并唤醒本地存档 */
export async function pullFromWebdav(cfg: WebdavConfig): Promise<SyncResult> {
  try {
    const res = await request(cfg, 'GET', fileUrl(cfg));
    if (res.status === 404) {
      return { status: 'no-remote', message: '驿站尚无一页残卷', applied: false };
    }
    // 405 及一切 3xx/4xx/5xx 均按驿站异常处理（405 多为 URL 指向目录而非文件）
    if (res.status >= 300) {
      return { status: 'error', message: `驿站闭门（HTTP ${res.status}）`, applied: false };
    }
    const text = await res.text();
    const parsed = parseArchive(text);
    if (!parsed.ok || !parsed.archive) {
      return { status: 'error', message: '驿站残卷字迹已毁', applied: false };
    }
    // 唤醒：先写回本地，再以写回后的月光计算指纹
    importFullSave(text);
    const localAt = localExportedAt();
    saveMeta({ lastRemoteAt: parsed.archive.exportedAt, lastFingerprint: fingerprint(exportFullSave()) });
    return {
      status: 'ok',
      message: `月光已自星海唤回（拓印于 ${new Date(parsed.archive.exportedAt).toLocaleString()}）`,
      applied: true,
      remoteAt: parsed.archive.exportedAt,
      localAt,
    };
  } catch {
    return { status: 'error', message: '星海无应答，收月失败', applied: false };
  }
}

/** 收月并落记基线（潮汐各收月分支复用；pullFromWebdav 内部已写 meta） */
async function pullAndCommit(cfg: WebdavConfig, remoteAt: number, msg: string): Promise<SyncResult> {
  const pulled = await pullFromWebdav(cfg);
  if (!pulled.applied) return pulled;
  return { status: 'ok', message: msg, applied: true, remoteAt, localAt: localExportedAt() };
}

/** 潮汐：自动同步。
 *  改动的判定一律基于内容指纹（时间戳受设备时钟偏差影响，不可信）：
 *    - 远端无卷：本地有月光则寄出；两处皆空则不动
 *    - 内容同源（指纹一致）：无需往返，即使基线已陈旧
 *    - 本地空卷（首次相认或存储被清）而驿站有月光 → 收月
 *    - 仅远端改动 → 收月；仅本地改动 → 寄月；双方各改 → 冲突
 *    - 首次相认且双方各有月光 → 交由玩家决断
 */
export async function syncTide(cfg: WebdavConfig): Promise<SyncResult> {
  const localArchive = exportFullSave();
  const localFp = fingerprint(localArchive);
  const localParsed = parseArchive(localArchive);
  // 本地是否持有任何域数据（避免把空卷寄上驿站、污染其他设备基线）
  const localHasData = !!localParsed.ok && !!localParsed.archive && Object.keys(localParsed.archive.domains).length > 0;
  const meta = loadMeta();
  // 从未与这座驿站同步过：本地指纹与空基线必然不同，不能据此判冲突
  const firstSync = meta.lastRemoteAt === 0 && meta.lastFingerprint === '';
  try {
    const res = await request(cfg, 'GET', fileUrl(cfg));
    if (res.status === 404) {
      // 驿站无卷
      if (!localHasData) {
        return { status: 'no-remote', message: '两轮皆空，尚无月光可寄', applied: false };
      }
      return pushToWebdav(cfg);
    }
    if (res.status >= 300) {
      return { status: 'error', message: `驿站闭门（HTTP ${res.status}）`, applied: false };
    }
    const text = await res.text();
    const parsed = parseArchive(text);
    if (!parsed.ok || !parsed.archive) {
      return { status: 'error', message: '驿站残卷字迹已毁', applied: false };
    }
    const remoteAt = parsed.archive.exportedAt;
    const remoteFp = fingerprint(text);
    // 双方内容同源即相合，无需往返（含双方同时改为相同内容的情形）
    if (localFp === remoteFp) {
      return { status: 'ok', message: '两轮月光本已相合，无需往返', applied: false, remoteAt, localAt: localExportedAt() };
    }
    const localChanged = !firstSync && localFp !== meta.lastFingerprint;
    const remoteChanged = !firstSync && remoteFp !== meta.lastFingerprint;
    if (!localHasData) {
      // 本地空卷（首次相认，或本地存储被清）而驿站有月光 → 唤回，勿把空卷寄上驿站
      return pullAndCommit(cfg, remoteAt, '月光已自星海唤回，从此两轮同辉');
    }
    if (remoteChanged && !localChanged) {
      // 远端有改动且本地未动 → 收月
      return pullAndCommit(cfg, remoteAt, '潮汐带回更晚的月光，已唤醒');
    }
    if (localChanged && !remoteChanged) {
      // 本地有改动且远端未动 → 寄月
      return pushToWebdav(cfg);
    }
    // 双方各有新月光（含首次相认时两处各有数据）→ 冲突，交由玩家决断
    return {
      status: 'conflict',
      message: firstSync
        ? '初次相认：驿站与本地各有一卷月光，需择一为准'
        : '两轮月亮各持新月光，需择一相认',
      applied: false,
      remoteAt,
      localAt: localExportedAt(),
    };
  } catch {
    return { status: 'error', message: '星海无应答，潮汐未起', applied: false };
  }
}

/** 拉取远端残卷文本（仅探测用途，不写回） */
export async function peekRemote(cfg: WebdavConfig): Promise<string | null> {
  try {
    const res = await request(cfg, 'GET', fileUrl(cfg));
    if (res.status >= 300) return null;
    return await res.text();
  } catch {
    return null;
  }
}
