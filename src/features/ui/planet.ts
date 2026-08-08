/* =========================================================
   蚀月远征 · 蚀月之望（右上角残月 · 存档同步入口）
   一轮被蚀影吞噬的月亮从页面角落露出一弯 —— 点击望月，
   可拓印月痕（导出 JSON）、唤回月痕（导入 JSON）、
   或经由星海驿站（WebDAV）让月光在两轮月亮间往返。
   ========================================================= */
import { AudioEngine } from '../../platform/audio/engine.js';
import { $, toast } from './hud_utils.js';
import { exportFullSave, importFullSave, parseArchive, localExportedAt } from '../../infra/persistence/archive.js';
import {
  loadWebdavConfig, saveWebdavConfig, clearWebdavConfig,
  probeWebdav, pushToWebdav, pullFromWebdav, syncTide,
  type WebdavConfig, type SyncResult,
} from '../../infra/persistence/webdav.js';

const PLANET_BTN = 'btn-planet';
const PLANET_PANEL = 'planet-panel';
const STATUS = 'planet-status';
const STATUS_TEXT = 'planet-status-text';

/* ---------- 打开 / 关闭 ---------- */
export function openPlanet(): void {
  AudioEngine.playSfx('click');
  restoreConfigIntoForm();
  refreshStatusLine();
  $(PLANET_PANEL).classList.remove('hidden');
  $(PLANET_BTN).classList.add('planet-hidden');
}

export function closePlanet(): void {
  AudioEngine.playSfx('close');
  $(PLANET_PANEL).classList.add('hidden');
  $(PLANET_BTN).classList.remove('planet-hidden');
}

export function isPlanetOpen(): boolean {
  return !$(PLANET_PANEL).classList.contains('hidden');
}

/* ---------- 状态行 ---------- */
function setStatus(msg: string, kind: 'info' | 'ok' | 'error' | 'syncing' = 'info'): void {
  const box = $(STATUS);
  box.classList.remove('error', 'syncing', 'info', 'ok');
  box.classList.add(kind === 'syncing' ? 'syncing' : kind === 'ok' ? 'info' : kind === 'error' ? 'error' : 'info');
  box.classList.toggle('error', kind === 'error');
  $(STATUS_TEXT).textContent = msg;
}

/** 打开面板时刷新状态：显示本地最近拓印时间 */
function refreshStatusLine(): void {
  const at = localExportedAt();
  if (at > 0) {
    setStatus(`本地月光拓印于 ${new Date(at).toLocaleString()} · 待望星海`, 'info');
  } else {
    setStatus('蚀月静悬，尚未望见星海', 'info');
  }
}

/* ---------- 驿站配置 ---------- */
function readConfigFromForm(): WebdavConfig {
  return {
    url: ($('sync-url') as HTMLInputElement).value.trim(),
    username: ($('sync-user') as HTMLInputElement).value.trim(),
    password: ($('sync-pass') as HTMLInputElement).value,
  };
}

function restoreConfigIntoForm(): void {
  const cfg = loadWebdavConfig();
  if (!cfg) return;
  ($('sync-url') as HTMLInputElement).value = cfg.url;
  ($('sync-user') as HTMLInputElement).value = cfg.username;
  ($('sync-pass') as HTMLInputElement).value = cfg.password;
}

function configFromFormOrStored(): WebdavConfig | null {
  const form = readConfigFromForm();
  if (form.url) {
    saveWebdavConfig(form);
    return form;
  }
  return loadWebdavConfig();
}

/* ---------- 拓印 / 唤回（JSON 导出导入） ---------- */
function exportToFile(): void {
  AudioEngine.playSfx('click');
  const json = exportFullSave();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eclipse-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus('月光已拓印成卷，随你远行', 'ok');
  toast('拓印完成 · 残卷已下载');
}

function onImportFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result ?? '');
    const res = parseArchive(text);
    if (!res.ok || !res.archive) {
      setStatus(res.error || '残卷字迹已毁，无法唤醒', 'error');
      toast('唤醒失败');
      return;
    }
    const hasLocal = localExportedAt() > 0;
    const confirmMsg = hasLocal
      ? `此卷拓印于 ${new Date(res.archive.exportedAt).toLocaleString()}。\n唤回它将覆写本地月光，月光不可回退 —— 仍要唤醒吗？`
      : `此卷拓印于 ${new Date(res.archive.exportedAt).toLocaleString()}。\n唤醒它将在此月背烙下全部远征 —— 确定吗？`;
    if (!window.confirm(confirmMsg)) {
      setStatus('残卷未启，月光如旧', 'info');
      return;
    }
    const imp = importFullSave(text);
    if (imp.ok) {
      setStatus(`月光已自残卷唤醒（拓印于 ${new Date(res.archive.exportedAt).toLocaleString()}）`, 'ok');
      toast('唤回成功 · 月光重烙');
    } else {
      setStatus(imp.error || '唤醒失败', 'error');
    }
  };
  reader.readAsText(file);
}

/* ---------- 星海驿站（WebDAV） ---------- */
function withConfig(fn: (cfg: WebdavConfig) => Promise<SyncResult>): Promise<void> {
  const cfg = configFromFormOrStored();
  if (!cfg) {
    setStatus('尚未指明星海驿站，先写下驿站地址与密语', 'error');
    toast('请先填写驿站地址');
    return Promise.resolve();
  }
  setStatus('月光正航向星海……', 'syncing');
  return fn(cfg).then((r) => {
    setStatus(r.message, r.status === 'error' ? 'error' : 'ok');
    if (r.status === 'conflict') {
      handleConflict(cfg, r);
    }
  });
}

/** 冲突：两轮月亮各持新月光，交由玩家决断 */
function handleConflict(cfg: WebdavConfig, r: SyncResult): void {
  const remoteStr = r.remoteAt ? new Date(r.remoteAt).toLocaleString() : '未知';
  const localStr = r.localAt ? new Date(r.localAt).toLocaleString() : '未知';
  const choice = window.confirm(
    `两轮月亮各持新月光：\n驿站之月（${remoteStr}） / 本地之月（${localStr}）。\n\n「确定」以驿站为准（收月覆写本地）；「取消」以本地为准（寄月覆写驿站）。`
  );
  if (choice) {
    pullFromWebdav(cfg).then((res) => setStatus(res.message, res.status === 'error' ? 'error' : 'ok'));
  } else {
    pushToWebdav(cfg).then((res) => setStatus(res.message, res.status === 'error' ? 'error' : 'ok'));
  }
}

/* ---------- 事件绑定 ----------
 * 仅绑定面板相关事件。残月按钮的「主菜单显形」状态联动已上移至 main.ts
 * （该联动是启动期常驻逻辑，不能随本模块懒加载，否则首帧前残月可见性会失联）。
 */
export function initPlanetUI(): void {
  $(PLANET_BTN).onclick = () => openPlanet();
  $('btn-planet-close').onclick = () => closePlanet();

  // 拓印 / 唤回
  $('btn-export-save').onclick = () => exportToFile();
  $('btn-import-save').onclick = () => { AudioEngine.playSfx('click'); $('file-import-save').click(); };
  $('file-import-save').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) onImportFile(file);
    input.value = ''; // 允许重复选择同一文件
  });

  // 星海驿站
  $('btn-sync-tide').onclick = () => withConfig(syncTide);
  $('btn-sync-push').onclick = () => withConfig(pushToWebdav);
  $('btn-sync-pull').onclick = () => withConfig(pullFromWebdav);
  $('btn-sync-probe').onclick = () => {
    const cfg = configFromFormOrStored();
    if (!cfg) { setStatus('尚未指明星海驿站', 'error'); return; }
    setStatus('正望驿站……', 'syncing');
    probeWebdav(cfg).then((ok) => {
      setStatus(ok ? '驿站遥见灯火，可寄月光' : '星海无应答，驿站未现', ok ? 'ok' : 'error');
    });
  };

  // 蚀月与主菜单同生共死：只在 MENU 状态显形 —— 该联动已在 main.ts 常驻注册，
  // 此处不再重复（避免模块懒加载后状态机钩子缺失，也避免重复注册）。

  // 清空驿站配置的入口（长按不可行，提供右键清除）
  $('sync-url').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (window.confirm('遗忘这座星海驿站？密语亦将一并拭去。')) {
      clearWebdavConfig();
      ($('sync-url') as HTMLInputElement).value = '';
      ($('sync-user') as HTMLInputElement).value = '';
      ($('sync-pass') as HTMLInputElement).value = '';
      setStatus('驿站已自记忆中抹去', 'info');
    }
  });
}
