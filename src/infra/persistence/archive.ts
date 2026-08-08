/* =========================================================
   蚀月远征 · 拓印术（完整存档序列化）
   将全部持久化域（解锁 / 烙记 / 成就 / 记手录 / 图鉴 / 辉光）
   拓印成一卷可携带的残卷（JSON），或从残卷唤醒全部月光。
   —— 拓印之页不认生，只要月光还在纸上，守月人便不曾走远。
   ========================================================= */

/** 全部持久化域键 —— 新增存档域时在此登记一次 */
export const DOMAIN_KEYS = [
  'eclipse_cycle_save',        // 解锁进度
  'eclipse_run_save_v1',       // 月光烙记（局内进度）
  'eclipse_achievements_save', // 蚀月功勋（成就）
  'eclipse_hands_save',        // 记手录
  'eclipse_codex_save',        // 蚀之图鉴
  'eclipse_settings_v1',       // 辉光调校（月蚀之仪）
] as const;

export const ARCHIVE_APP = 'moonlight-chronicle';
export const ARCHIVE_VERSION = 1;

/** 残卷结构：app / v / exportedAt / domains（各域原始 localStorage 值） */
export interface ArchiveV1 {
  app: typeof ARCHIVE_APP;
  v: 1;
  exportedAt: number;
  domains: Record<string, string>;
}

export interface ArchiveResult {
  ok: boolean;
  error?: string;
  archive?: ArchiveV1;
}

/** 读取某个域的原始值（可能不存在 → undefined） */
export function readDomain(key: string): string | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ?? undefined;
  } catch {
    return undefined;
  }
}

/** 写回某个域的原始值 */
export function writeDomain(key: string, raw: string): void {
  try {
    localStorage.setItem(key, raw);
  } catch {
    /* 写盘失败静默：与既有持久化语义一致 */
  }
}

/** 拓印：收集全部持久化域，返回残卷 JSON 字符串 */
export function exportFullSave(now: number = Date.now()): string {
  const domains: Record<string, string> = {};
  for (const key of DOMAIN_KEYS) {
    const raw = readDomain(key);
    if (raw !== undefined) domains[key] = raw;
  }
  const archive: ArchiveV1 = {
    app: ARCHIVE_APP,
    v: ARCHIVE_VERSION,
    exportedAt: now,
    domains,
  };
  return JSON.stringify(archive);
}

/** 校验并解析残卷 JSON 字符串 */
export function parseArchive(json: string): ArchiveResult {
  try {
    const raw = JSON.parse(json) as Partial<ArchiveV1>;
    if (!raw || raw.app !== ARCHIVE_APP) {
      return { ok: false, error: '此页并非蚀月拓印' };
    }
    if (raw.v !== ARCHIVE_VERSION) {
      return { ok: false, error: `拓印出自不同年代（v${raw.v ?? '?'}），无法唤醒` };
    }
    if (typeof raw.exportedAt !== 'number' || typeof raw.domains !== 'object' || raw.domains === null) {
      return { ok: false, error: '拓印残缺，字迹无法辨认' };
    }
    return { ok: true, archive: raw as ArchiveV1 };
  } catch {
    return { ok: false, error: '拓印字迹已毁，无法辨认' };
  }
}

/** 唤醒：将残卷写回全部持久化域。返回成功与否 */
export function importFullSave(json: string): ArchiveResult {
  const res = parseArchive(json);
  if (!res.ok || !res.archive) return res;
  for (const key of DOMAIN_KEYS) {
    const raw = res.archive.domains[key];
    if (typeof raw === 'string') writeDomain(key, raw);
  }
  return res;
}

/** 获取本地最近一次拓印时间（全部域中最大的 exportedAt，无存档返回 0） */
export function localExportedAt(): number {
  let max = 0;
  for (const key of DOMAIN_KEYS) {
    const raw = readDomain(key);
    if (raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw);
      const t = typeof parsed?.exportedAt === 'number' ? parsed.exportedAt : 0;
      if (t > max) max = t;
    } catch {
      /* 无法解析的域不参与比较 */
    }
  }
  return max;
}
