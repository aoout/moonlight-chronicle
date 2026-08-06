/* =========================================================
   蚀月远征 · 运行环境开关（引擎级，零依赖）
   两类开关：
   1) 开发者模式 —— 图鉴 / 深度全解锁
   2) 固定负载闸门 —— 基准压测时抑制随机性与运行期特效
   下层模块只读取开关；具体判定由 infra/debug 在加载时注册（依赖倒置）。
   ========================================================= */

/* ---------- 开发者模式 ----------
   判定优先级：URL 参数 ?dev=1（一次性） > localStorage（持久）
               > 构建环境变量 VITE_GOD_MODE（npm run dev:god）
   只做只读覆盖，不写入正式存档；关闭后恢复真实进度。 */

const LS_KEY = 'eclipse_dev_mode';

export function isDevMode(): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).has('dev')) return true;
      if (localStorage.getItem(LS_KEY) === '1') return true;
    } catch { /* localStorage 不可用（隐私模式等）时忽略 */ }
  }
  return import.meta.env.VITE_GOD_MODE === 'true';
}

/** 运行时切换（写入 localStorage；?dev=1 为一次性，不受此影响） */
export function setDevMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
  } catch { /* 忽略 */ }
}

/* ---------- 固定负载闸门（依赖倒置） ----------
   systems / platform 只问「现在是不是固定负载模式」，
   不关心答案来自基准测试、录制回放还是别的什么。
   默认永远为 false；infra/debug 的固定负载基准会注册自己的判定。 */

type Probe = () => boolean;
const ALWAYS_FALSE: Probe = () => false;
let _fixedProbe: Probe = ALWAYS_FALSE;

/** 注册固定负载判定；传 null 恢复默认 */
export function setFixedLoadProbe(fn: Probe | null): void {
  _fixedProbe = fn || ALWAYS_FALSE;
}

/** 当前是否处于固定负载模式（应抑制随机性与运行期特效） */
export function isFixedLoad(): boolean {
  return _fixedProbe();
}
