/* =========================================================
   蚀月远征 · 手柄操作提示条
   手柄接入时于屏幕底部显示上下文相关的按键提示。
   复用通用 HintBar 组件。
   字形为纯 SVG（无 emoji），配色取 Xbox 经典色但降饱和
   以契合月蚀金调。
   ========================================================= */
import { inputState } from '../../state/input.js';
import { getActiveContextKey } from './gamepad_nav.js';
import { HintBar } from './components/HintBar.js';

interface HintItem { b: string; l: string }

const HINTS: Record<string, HintItem[]> = {
  menu:     [{ b: 'dpad', l: '选择' }, { b: 'a', l: '确认' }],
  playing:  [{ b: 'ls', l: '移动' }, { b: 'menu', l: '暂停' }],
  pause:    [{ b: 'a', l: '继续远征' }, { b: 'b', l: '返回主菜单' }],
  levelup:  [{ b: 'dpad', l: '选择' }, { b: 'lb', l: '上一项' }, { b: 'rb', l: '下一项' }, { b: 'a', l: '烙印' }],
  shop:     [{ b: 'lb', l: '上一区' }, { b: 'rb', l: '下一区' }, { b: 'dpad', l: '导航' }, { b: 'a', l: '查看 / 购买' }, { b: 'b', l: '下一夜' }],
  result:   [{ b: 'a', l: '重返远征' }],
  codex:    [{ b: 'lb', l: '上一类' }, { b: 'rb', l: '下一类' }, { b: 'dpad', l: '浏览' }, { b: 'b', l: '返回' }],
  achievements: [{ b: 'dpad', l: '浏览功勋' }, { b: 'b', l: '返回' }],
  gate:     [{ b: 'dpad', l: '选择' }, { b: 'a', l: '确定' }, { b: 'b', l: '返回' }],
  howto:    [{ b: 'a', l: '关闭' }, { b: 'b', l: '关闭' }],
};

let hintBar: HintBar | null = null;
let _lastKey = '';
let _lastConnected = false;

/* ---------- Xbox 按键字形 ---------- */

const C_A = '#7bb56e';
const C_B = '#d75e5e';
const C_X = '#5e8fd7';
const C_Y = '#d7c35e';
const C_MOON = '#f4ecd8';
const C_LINE = 'rgba(233,201,135,.5)';

function glyphCircle(letter: string, color: string): string {
  return '<svg viewBox="0 0 24 24" width="1em" height="1em">' +
    '<circle cx="12" cy="12" r="10" fill="' + color + '" opacity=".9"/>' +
    '<text x="12" y="16.2" text-anchor="middle" font-size="11" font-weight="800" ' +
    'fill="#0d1030" font-family="Inter,sans-serif">' + letter + '</text></svg>';
}

function glyphBumper(text: string): string {
  return '<svg viewBox="0 0 30 18" width="1.5em" height="0.9em">' +
    '<rect x="1" y="2" width="28" height="14" rx="4" fill="rgba(244,236,216,.12)" ' +
    'stroke="' + C_LINE + '" stroke-width="1"/>' +
    '<text x="15" y="13" text-anchor="middle" font-size="9" font-weight="700" ' +
    'fill="' + C_MOON + '" font-family="Inter,sans-serif">' + text + '</text></svg>';
}

function glyphDpad(): string {
  return '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em">' +
    '<circle cx="12" cy="12" r="10" fill="rgba(244,236,216,.10)" stroke="' + C_LINE + '" stroke-width="1"/>' +
    '<path d="M12 3 L15 7 L13.5 7 L13.5 10.5 L17 10.5 L17 12 L20 12 L20 12 L17 12 L17 13.5 L13.5 13.5 L13.5 17 L15 17 L12 21 L9 17 L10.5 17 L10.5 13.5 L7 13.5 L7 12 L4 12 L4 12 L7 12 L7 10.5 L10.5 10.5 L10.5 7 L9 7 Z" ' +
    'fill="rgba(233,201,135,.22)" stroke="' + C_LINE + '" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M12 7.5 l2 2.5 M12 7.5 l-2 2.5 M16.5 12 l-2.5 2 M16.5 12 l-2.5 -2 M12 16.5 l2 -2.5 M12 16.5 l-2 -2.5 M7.5 12 l2.5 2 M7.5 12 l2.5 -2" ' +
    'stroke="' + C_MOON + '" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>';
}

function glyphStick(): string {
  return '<svg viewBox="0 0 24 24" width="1em" height="1em">' +
    '<circle cx="12" cy="12" r="9.5" fill="rgba(244,236,216,.08)" stroke="' + C_LINE + '" stroke-width="1"/>' +
    '<circle cx="12" cy="12" r="3.6" fill="rgba(233,201,135,.85)"/></svg>';
}

function glyphMenu(): string {
  return '<svg viewBox="0 0 24 18" width="1.2em" height="0.9em">' +
    '<rect x="3" y="4" width="18" height="2" rx="1" fill="' + C_MOON + '"/>' +
    '<rect x="3" y="9" width="18" height="2" rx="1" fill="' + C_MOON + '"/>' +
    '<rect x="3" y="14" width="18" height="2" rx="1" fill="' + C_MOON + '"/></svg>';
}

function btnGlyph(name: string): string {
  switch (name) {
    case 'a': return glyphCircle('A', C_A);
    case 'b': return glyphCircle('B', C_B);
    case 'x': return glyphCircle('X', C_X);
    case 'y': return glyphCircle('Y', C_Y);
    case 'lb': return glyphBumper('LB');
    case 'rb': return glyphBumper('RB');
    case 'lt': return glyphBumper('LT');
    case 'rt': return glyphBumper('RT');
    case 'menu': return glyphMenu();
    case 'ls': return glyphStick();
    case 'dpad': return glyphDpad();
    default: return '';
  }
}

/* ---------- 初始化与刷新 ---------- */

export function initHint(): void {
  hintBar = new HintBar({
    position: { top: '18px', centerOffsetX: 280 },
    pointerEvents: 'none',
    className: 'gamepad-hint',
  });
  hintBar.mount();
  hintBar.hide();
}

/** 每帧调用：仅在连接状态或上下文变化时改写 DOM */
export function refreshHint(): void {
  if (!hintBar) return;
  const gp = inputState.state.gamepad;
  if (gp.connected !== _lastConnected) {
    _lastConnected = gp.connected;
    _lastKey = '';
    if (gp.connected) {
      // 先填充内容和定位，再显示，避免空胶囊闪烁
      const key = getActiveContextKey();
      _lastKey = key;
      const items = HINTS[key] || [];
      hintBar.setItems(items.map(it => ({
        icon: btnGlyph(it.b),
        label: it.l,
      })));
      hintBar.show();
    } else {
      hintBar.hide();
    }
    return;
  }
  if (!gp.connected) return;
  const key = getActiveContextKey();
  if (key === _lastKey) return;
  _lastKey = key;
  const items = HINTS[key] || [];
  hintBar.setItems(items.map(it => ({
    icon: btnGlyph(it.b),
    label: it.l,
  })));
}
