/* =========================================================
   蚀月远征 · 月蚀玻璃 · 性能档位桥接
   将「蚀相档位」同步到 <html data-preset>，供 CSS 玻璃材质联动降级：
   - high / ultra：完整玻璃（默认，不妥协）
   - medium：模糊减半，光晕减淡
   - low：关闭 backdrop-filter，收束为纯色衬底
   - custom：不匹配任何档位规则 → 保留完整玻璃（玩家手调细项时不强制降级）
   CSS 规则见 css/tokens.css「月蚀玻璃 · 性能档位联动」。
   置于 features/ui：操作 DOM 是表现层职责，state 层保持纯净。
   ========================================================= */
import { settingsState } from '../../state/settings.js';

/** 把当前档位同步到 <html data-preset>（custom 原样写入，CSS 端无匹配即不降级） */
function syncPresetAttribute(): void {
  document.documentElement.dataset.preset = settingsState.state.preset;
}

/** 保存 Store.on() 取消订阅函数，供 destroyGlassQuality 清理 */
let _glassUnsub: (() => void) | null = null;

/** 订阅档位变更并立即同步一次（模块加载即生效，含 localStorage 恢复的档位） */
export function initGlassQuality(): void {
  destroyGlassQuality();
  syncPresetAttribute();
  _glassUnsub = settingsState.on('preset', syncPresetAttribute);
}

/** 销毁玻璃品质订阅，防止重复累积 */
export function destroyGlassQuality(): void {
  if (_glassUnsub) { _glassUnsub(); _glassUnsub = null; }
}
