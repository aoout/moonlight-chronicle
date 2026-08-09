/* =========================================================
   蚀月远征 · 升级祝福 · 蚀月轮盘面板
   12 格命运轮盘（11 祝福 + 1 蚀格），四种操作：
   随机拨动 / 强化 / 踢格替代 / 月轮
   动画与落点同源：先算落点 → 转动画 → 命令层复用同一落点。
   ========================================================= */
import { Component } from '../component.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import { $, html, toast } from '../hud_utils.js';
import { pSt } from '../../../state/accessors.js';
import {
  spinWheelTake, sieveTake, enhanceBlessingCmd, swapBlessingCmd, castMoonWheelCmd, currentMoonPacts,
  resumeAfterLevelUp,
} from '../../../commands/index.js';
import {
  buildWheel, spinWheel, blessingById, sieveCandidates, doubleDescNums, enhanceNoteFor,
  ENHANCE_COST, SWAP_COST, MOON_WHEEL_COST, BLANK_GOLD,
} from '../../../domain/fortune_wheel.js';
import { isEnhanced } from '../../../state/fortune.js';
import type { Player } from '../../../types/core.d.ts';
import type { WheelSlot } from '../../../domain/fortune_wheel.js';

/* 轮盘几何（SVG 400×400，中心 200,200，扇区外径 R=168，hub 外缘 ~43）
   布局：图标中心半径 ICON_R 落在扇区径向几何中心（hub+R）/2 ≈ 105 */
const CX = 200, CY = 200, R = 168;
const ICON_R = 105;
const DOT_R = 150;
const MARK_R = 72;
const SPIN_MS = 2200;             // 转动动画时长
const SPIN_TURNS = 5;             // 转动圈数（含落点）

/* 扇区宝石渐变（对应 index.html <defs> 的 radialGradient id） */
const SEG_GRADS: Record<string, string> = {
  common: 'segCommon',
  epic: 'segEpic',
  legend: 'segLegend',
  blank: 'segBlank',
};
const SEG_STROKE = '#151a33';
/* 扇区图标 / 品质色点用色（与稀有度一致） */
const SEG_TIER_COLOR: Record<string, string> = {
  common: '#9fd6e8',
  epic: '#b49ae8',
  legend: '#e9c987',
  blank: '#e2546a',
};

/** 剥掉祝福 desc 里的 HTML 标签（toast 提示用纯文本） */
function stripTags(s: string): string {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** 从完整图标 SVG 字符串剥离外层 <svg> 包裹，得到可嵌入盘面 <g> 的内部 path/circle */
function iconBody(icon: string): string {
  return String(icon || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

/* 操作按钮悬停预览：命运之台（preview 模式）展示该仪轨的代价与效果 */
const OP_PREVIEW: Record<string, string> = {
  'wa-spin':
    `<span class="wd-tier op-spin">随机拨动</span>` +
    `<span class="wd-name">蚀月仪轨 · 免费</span>` +
    `<span class="wd-desc">拨动轮盘，指针所指即所得；此夜附赠 <b class="stat-up">1 月契</b>。</span>`,
  'wa-sieve':
    `<span class="wd-tier op-sieve">命运筛选</span>` +
    `<span class="wd-name">三选一 · 免费</span>` +
    `<span class="wd-desc">指针落点与左右相邻共三格浮现，择一烙印；代价是放弃拨动的月契。</span>`,
  'wa-enhance':
    `<span class="wd-tier op-enhance">强化</span>` +
    `<span class="wd-name">消耗 2 月契</span>` +
    `<span class="wd-desc">为轮盘上一位祝福烙上印记，每种仅一次。寻常翻倍 · 非凡回响 · 命运三连。</span>`,
  'wa-swap':
    `<span class="wd-tier op-swap">踢格替代</span>` +
    `<span class="wd-name">消耗 3 月契</span>` +
    `<span class="wd-desc">踢出一格，自轮盘外定向请来一位祝福，并立即获得其力。</span>`,
  'wa-moon':
    `<span class="wd-tier op-moon">月轮</span>` +
    `<span class="wd-name">消耗 5 月契</span>` +
    `<span class="wd-desc">以 10× 攻击力蚀月之怒横扫全场；月辉回涌，生命回复至上限 80%。</span>`,
};

interface Seg { i: number; a0: number; a1: number; }

export class LevelUpPanel extends Component<Player> {
  private slots: WheelSlot[] = [];
  private segs: Seg[] = [];
  private mode: 'idle' | 'enhance' | 'swap' = 'idle';
  private spinning = false;
  /* 命运筛选（三选一）候选阶段 */
  private sieveActive = false;
  private sieveIdx: number[] = [];
  private lastLandIdx = 0;
  /* 命运之台（常驻玻璃显示框）当前模式：preview 预览 / result 结果 / sieve 三选一 */
  private consoleMode: 'preview' | 'result' | 'sieve' = 'preview';
  /** 所有未清除的 setTimeout id，_close 时统一清理 */
  private _timeoutIds: number[] = [];

  render(): string {
    return html`<div id="levelup" class="overlay hidden"><div class="overlay-bg"></div><div class="panel levelup-panel"></div></div>`;
  }

  /* ---------- 命运之台：单一显示组件（预览/结果/三选一共用） ---------- */
  private renderConsole(mode: 'preview' | 'result' | 'sieve', body: string): void {
    const c = $('wheel-console');
    if (!c) return;
    this.consoleMode = mode;
    c.classList.remove('preview', 'result', 'sieve');
    c.classList.add(mode);
    const b = $('wheel-console-body');
    if (b) b.innerHTML = body;
  }

  private static CONSOLE_HINT = '<span class="wd-hint">悬停轮盘扇区 · 查看祝福效果</span>';

  /* ---------- 打开：构建轮盘 + 渲染 ---------- */
  open(p: Player): void {
    if (!p) return;
    AudioEngine.playSfx('levelup');
    this.bind();
    this.mode = 'idle';
    this.spinning = false;
    this.sieveActive = false;
    this.sieveIdx = [];
    const svg = $('wheel-svg');
    svg.classList.remove('spinning');
    document.querySelectorAll('#wheel-disk > path').forEach(pth => pth.classList.remove('sieve-hi'));
    this.highlightSlots();
    this.renderConsole('preview', LevelUpPanel.CONSOLE_HINT);
    this.slots = buildWheel(p.luck);
    this.renderWheel();
    this.refreshPacts();
    const ov = $('levelup');
    ov.classList.remove('hidden');
    ov.classList.add('incoming');
  }

  /** 跟踪 setTimeout，_close 时统一清理 */
  private _setTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(fn, ms);
    this._timeoutIds.push(id);
    return id;
  }

  _close(): void {
    /* 清理所有未触发的 setTimeout，防止面板关闭后回调操作过期 DOM 或状态 */
    for (const id of this._timeoutIds) window.clearTimeout(id);
    this._timeoutIds = [];
    $('levelup').classList.add('hidden');
    this.mode = 'idle';
    /* 面板真正关闭才切回 PLAYING：结果展示期间世界保持 LEVELUP 冻结，
       避免「选完轮盘怪物已行动一会」（resumeAfterLevelUp 幂等：队列未清空/非 LEVELUP 不切） */
    resumeAfterLevelUp();
  }

  /* ---------- 渲染轮盘 SVG 扇区 ---------- */
  private renderWheel(): void {
    const disk = $('wheel-disk');
    disk.innerHTML = '';

    /* 按权重计算扇区角度 */
    const total = this.slots.reduce((s, slot) => s + this.slotW(slot), 0);
    const segs: Seg[] = [];
    let acc = -90; /* 指针在顶部，从 12 点方向顺时针 */
    const parts: string[] = [];

    this.slots.forEach((slot, i) => {
      const w = this.slotW(slot);
      const sweep = (w / total) * 360;
      const a0 = acc, a1 = acc + sweep;
      const mid = a0 + sweep / 2;
      segs.push({ i, a0, a1 });

      /* 扇区：宝石渐变 + 细描边；data-i 供落点命中/候选高亮精确定位 */
      const large = sweep > 180 ? 1 : 0;
      const path = `M${CX} ${CY} L${this.polar(a0, R).x} ${this.polar(a0, R).y} ` +
        `A${R} ${R} 0 ${large} 1 ${this.polar(a1, R).x} ${this.polar(a1, R).y} Z`;
      const tier = slot.kind === 'blank' ? 'blank' : (slot.blessingId ? blessingById(slot.blessingId)?.tier : undefined) || 'common';
      parts.push(`<path data-i="${i}" d="${path}" fill="url(#${SEG_GRADS[tier] || 'segCommon'})" stroke="${SEG_STROKE}" stroke-width="1"/>`);

      /* 扇区内容：祝福 → 图标 + 品质色点；蚀格 → 蚀月符号 + 血色点
         （名称与效果交给命运之台悬停展示，盘面只留图腾，保持可读与精致）
         图标按扇区弧长自适应缩放：窄扇区（命运级）缩小防重叠，宽扇区封顶 */
      if (slot.kind === 'blank') {
        const p1 = this.polar(mid, ICON_R);
        /* 蚀月新月：lucide moon 标准居中路径（translate(-12,-12) 归心后放大） */
        parts.push(
          `<g class="seg-blank-cr" transform="translate(${p1.x} ${p1.y})">` +
          `<path transform="translate(-12 -12) scale(1.3)" d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z" fill="#e2546a"/></g>`,
        );
        const d = this.polar(mid, DOT_R);
        parts.push(`<circle class="seg-dot" cx="${d.x}" cy="${d.y}" r="3" fill="#e2546a" color="#e2546a"/>`);
      } else {
        const b = slot.blessingId ? blessingById(slot.blessingId) : undefined;
        if (b) {
          const p1 = this.polar(mid, ICON_R);
          const tint = SEG_TIER_COLOR[b.tier] || SEG_TIER_COLOR.common;
          const arc = 2 * Math.PI * ICON_R * (sweep / 360);
          const scale = Math.min(0.96, Math.max(0.5, arc / 27));
          /* 图标 body 以左上角 (0,0) 为基准：translate 补偿半宽（12×scale），让图腾真正落在扇区中心 */
          parts.push(
            `<g class="seg-icon" transform="translate(${p1.x - 12 * scale} ${p1.y - 12 * scale}) scale(${scale})" color="${tint}">` +
            `${iconBody(b.icon)}</g>`,
          );
          const d = this.polar(mid, DOT_R);
          parts.push(`<circle class="seg-dot" cx="${d.x}" cy="${d.y}" r="3" fill="${tint}" color="${tint}"/>`);
        }
      }
      acc += sweep;
    });

    this.segs = segs;

    disk.innerHTML = parts.join('');
    disk.style.transition = 'none';
    disk.style.transform = 'rotate(0deg)';

    /* 强化印记：已强化的祝福格加金色月牙角标 */
    const marks: string[] = [];
    this.slots.forEach((slot, i) => {
      if (slot.kind === 'blessing' && slot.blessingId && isEnhanced(slot.blessingId)) {
        const seg = segs[i];
        const mid = seg.a0 + (seg.a1 - seg.a0) / 2;
        const p1 = this.polar(mid, MARK_R);
        marks.push(`<g transform="translate(${p1.x} ${p1.y})"><circle r="8" fill="rgba(233,201,135,.16)" stroke="#e9c987" stroke-width="1.2"/><path d="M-3.4-4.4a6.8 6.8 0 0 1 0 8.8M-3.4-4.4a6.8 6.8 0 0 0 0 8.8" stroke="#e9c987" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`);
      }
    });
    disk.innerHTML += marks.join('');

    /* 扇区独立点击：手柄聚焦确认 / 直接命中走 data-i → onSectorClick（不依赖鼠标坐标） */
    disk.querySelectorAll(':scope > path').forEach((p, i) => {
      (p as HTMLElement).onclick = (e: MouseEvent) => {
        e.stopPropagation();
        this.onSectorClick(i);
      };
    });
    this.updateSelPaths();
  }

  private slotW(slot: WheelSlot): number {
    if (slot.kind === 'blank') return 6;
    const b = slot.blessingId ? blessingById(slot.blessingId) : undefined;
    if (!b) return 0;
    const luck = pSt().player?.luck || 1;
    return b.tier === 'legend' ? b.weight * (1 + luck * 2) : b.tier === 'epic' ? b.weight * (1 + luck) : b.weight;
  }

  private polar(deg: number, r: number): { x: number; y: number } {
    const a = deg * Math.PI / 180;
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
  }

  /* ---------- 月契余额刷新（仅轮盘中央核心显示） ---------- */
  private refreshPacts(): void {
    const n = currentMoonPacts();
    const t = $('wheel-pacts-hub');
    if (!t) return;
    t.textContent = String(n);
    t.classList.remove('pop');
    void t.offsetWidth;   /* 强制回流，重触发 numPop */
    t.classList.add('pop');
    /* 按钮可用性：筛选免费；其余按月契；候选阶段/转动中全部禁用 */
    const lock = this.spinning || this.sieveActive;
    const can = (id: string, cost: number) => { const b = $('wa-' + id); if (b) b.classList.toggle('disabled', lock || n < cost); };
    const canFree = (id: string) => { const b = $('wa-' + id); if (b) b.classList.toggle('disabled', lock); };
    canFree('spin');
    canFree('sieve');
    can('enhance', ENHANCE_COST);
    can('swap', SWAP_COST);
    can('moon', MOON_WHEEL_COST);
    this.setTip('');
  }

  private setTip(msg: string): void {
    const t = $('wheel-tip');
    if (t) t.textContent = msg;
  }

  private setResult(htmlStr: string): void {
    this.renderConsole('result', htmlStr);
  }

  /* ---------- 操作 1/5 · 随机拨动 / 命运筛选（落点三选一） ---------- */
  private doSpin(mode: 'spin' | 'sieve' = 'spin'): void {
    if (this.spinning || this.sieveActive) return;
    const p = pSt().player;
    if (!p) return;
    this.spinning = true;
    const svg = $('wheel-svg');
    svg.classList.add('spinning');
    this.mode = 'idle';
    this.highlightSlots();
    this.renderConsole('preview', LevelUpPanel.CONSOLE_HINT);
    this.refreshPacts();

    /* 先算落点（与命令层同源），再转动画 */
    const idx = spinWheel(this.slots, p.luck);
    const seg = this.segs[idx];
    const center = seg ? seg.a0 + (seg.a1 - seg.a0) / 2 : 0;
    const disk = $('wheel-disk');
    disk.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.16,.9,.28,1)`;
    disk.style.transform = `rotate(${SPIN_TURNS * 360 - (center + 90)}deg)`;

    AudioEngine.playSfx('open');
    this._setTimeout(() => {
      this.spinning = false;
      svg.classList.remove('spinning');
      if (mode === 'sieve') {
        /* 进入三选一阶段：落点 + 左右相邻格可选 */
        this.lastLandIdx = idx;
        this.sieveActive = true;
        this.sieveIdx = sieveCandidates(this.slots, idx);
        this.showSieveCandidates(idx);
      } else {
        const r = spinWheelTake(this.slots, idx);
        if (!r.ok) { this._close(); return; }
        this.markHit(idx);
        this.showTakeResult(r);
        if (!r.hasMore) {
          this._setTimeout(() => this._close(), 1400);
        } else {
          /* 队列还有剩余：重建轮盘继续 */
          this._setTimeout(() => {
            const pp = pSt().player;
            if (pp) this.open(pp);
          }, 900);
        }
      }
    }, SPIN_MS);
  }

  /* ---------- 扇区统一操作入口（鼠标 / 触摸 / 手柄聚焦确认共用） ----------
     筛选候选阶段 → 选命牌；强化模式 → 选中未强化祝福；踢格模式 → 踢任意格 */
  private onSectorClick(idx: number): void {
    if (this.spinning) return;
    if (this.sieveActive) {
      const k = this.sieveIdx.indexOf(idx);
      if (k >= 0) this.chooseSieve(k);
      return;
    }
    if (this.mode === 'idle') return;
    const slot = this.slots[idx];
    if (!slot) return;
    if (this.mode === 'enhance') {
      if (slot.kind === 'blank' || !slot.blessingId || isEnhanced(slot.blessingId)) return;
      this.tryEnhance(slot.blessingId);
    } else if (this.mode === 'swap') {
      this.trySwap(slot.kind === 'blank' ? 'blank' : (slot.blessingId || 'blank'));
    }
  }

  /* ---------- 可选扇区标记（手柄聚焦收集用）：
     强化模式仅未强化的祝福格可选；踢格模式全部格可选（含蚀格） ---------- */
  private updateSelPaths(): void {
    document.querySelectorAll('#wheel-disk > path').forEach((p, i) => {
      const slot = this.slots[i];
      let ok = false;
      if (this.mode === 'enhance') ok = slot.kind === 'blessing' && !!slot.blessingId && !isEnhanced(slot.blessingId);
      else if (this.mode === 'swap') ok = true;
      p.classList.toggle('sel-ok', ok);
    });
  }

  /* ---------- 命运筛选 · 候选展示（轮盘高亮 + 三张命牌） ---------- */
  private showSieveCandidates(landIdx: number): void {
    /* 轮盘上高亮候选扇区（仅直接子级扇区 path，避免误伤扇区图标） */
    const paths = Array.from(document.querySelectorAll('#wheel-disk > path')) as HTMLElement[];
    paths.forEach((pth, i) => pth.classList.toggle('sieve-hi', this.sieveIdx.includes(i)));

    const landSlot = this.slots[landIdx];
    const landName = landSlot.kind === 'blank' ? '蚀格' : (landSlot.blessingId ? blessingById(landSlot.blessingId)?.name : undefined) || '';
    /* 命牌：品质色图标圆片（复用祝福图腾）+ 名称 + tier 徽记 + 效果，与盘面视觉同源 */
    const cards = this.sieveIdx.map((ci, k) => {
      const slot = this.slots[ci];
      const isLand = ci === landIdx;
      if (slot.kind === 'blank') {
        return `<div class="sieve-card${isLand ? ' land' : ''}" data-k="${k}" style="--sc-rgb:var(--blood-rgb);--sc-color:var(--blood)">
          <span class="sc-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/></svg></span>
          <span class="sc-name">蚀月空转</span>
          <span class="sc-desc">月亮收走祝福，留下 ${BLANK_GOLD} 枚铜钱</span>
        </div>`;
      }
      const b = slot.blessingId ? blessingById(slot.blessingId) : undefined;
      if (!b) {
        return `<div class="sieve-card${isLand ? ' land' : ''}" data-k="${k}">
          <span class="sc-name">未知祝福</span>
          <span class="sc-desc">数据缺失</span>
        </div>`;
      }
      const tierName = b.tier === 'legend' ? '命运' : b.tier === 'epic' ? '非凡' : '寻常';
      let desc = b.desc;
      if (isEnhanced(b.id) && b.tier === 'common') desc = doubleDescNums(b.desc);
      const rgb = b.tier === 'legend' ? 'var(--gold-rgb)' : b.tier === 'epic' ? 'var(--violet-rgb)' : 'var(--ice-rgb)';
      const color = b.tier === 'legend' ? 'var(--gold)' : b.tier === 'epic' ? 'var(--violet)' : 'var(--ice)';
      return `<div class="sieve-card ${b.tier}${isLand ? ' land' : ''}" data-k="${k}" style="--sc-rgb:${rgb};--sc-color:${color}">
        <span class="sc-ic">${b.icon}</span>
        <span class="sc-name">${b.name}<span class="sc-tier">${tierName}</span></span>
        <span class="sc-desc">${desc}</span>
      </div>`;
    }).join('');

    this.renderConsole('sieve', html`<div class="sieve-pick">
      <div class="sieve-title">落点 <b>「${landName}」</b> · 相邻三格，择一烙印</div>
      <div class="sieve-cards">${cards}</div>
    </div>`);
    document.querySelectorAll('.sieve-card').forEach(c => {
      (c as HTMLElement).onclick = () => {
        const k = (c as HTMLElement).dataset.k;
        if (k !== undefined) this.chooseSieve(+k);
      };
    });
  }

  /* ---------- 命运筛选 · 选择候选 → 结算（无保底月契） ---------- */
  private chooseSieve(k: number): void {
    if (!this.sieveActive) return;
    this.sieveActive = false;
    this.sieveIdx = [];
    document.querySelectorAll('#wheel-disk > path').forEach(pth => pth.classList.remove('sieve-hi'));
    const pp = pSt().player;
    if (!pp) return;
    const r = sieveTake(this.slots, this.lastLandIdx, k);
    if (!r.ok) { this._close(); return; }
    AudioEngine.playSfx('upgrade');
    this.showTakeResult(r);
    if (!r.hasMore) {
      this._setTimeout(() => this._close(), 1400);
    } else {
      this._setTimeout(() => {
        const p2 = pSt().player;
        if (p2) this.open(p2);
      }, 900);
    }
  }

  /* ---------- 落点命中反馈：命中扇区金色脉冲 + 蚀月之针闪光 ---------- */
  private markHit(idx: number): void {
    const pth = document.querySelector(`#wheel-disk > path[data-i="${idx}"]`);
    const ptr = $('wheel-pointer-g');
    pth?.classList.add('hit');
    ptr?.classList.add('hit');
    this._setTimeout(() => {
      pth?.classList.remove('hit');
      ptr?.classList.remove('hit');
    }, 1300);
  }

  private showTakeResult(r: any): void {
    const pacts = r.spinPacts || 0;
    const pactsNote = pacts > 0 ? `<br><small>月契 +${pacts}</small>` : '';
    if (r.kind === 'blank') {
      this.setResult(html`<div class="wheel-result-box blank"><b>蚀格空转</b>——月亮收走了祝福，留下 ${r.gold} 枚铜钱。${pactsNote}</div>`);
      toast('蚀格 · 补偿 ' + r.gold + ' 金币');
    } else {
      const b = blessingById(r.id);
      const desc = b ? b.desc : '';
      const enh = r.pacts !== undefined ? ` · 月契 +${r.pacts} 金币 +${r.gold}` : '';
      const chain = r.chainNames && r.chainNames.length
        ? `<div class="wr-chain">命运回响：${r.chainNames.join(' / ')}</div>` : '';
      this.setResult(html`<div class="wheel-result-box"><b>${r.name}</b> 已烙印<span class="wr-desc">${desc}</span>${enh}${chain}${pactsNote}</div>`);
      toast(r.name + ' 已烙印 · ' + stripTags(desc));
    }
    this.refreshPacts();
  }

  /* ---------- 操作 2 · 强化（选择模式） ---------- */
  private enterEnhance(): void {
    if (this.spinning || this.sieveActive) return;
    this.mode = this.mode === 'enhance' ? 'idle' : 'enhance';
    this.setTip(this.mode === 'enhance'
      ? '点击轮盘上的一个祝福进行强化（2 月契，每种只能一次）'
      : '');
    this.highlightSlots();
  }

  private tryEnhance(id: string): void {
    const r = enhanceBlessingCmd(id);
    if (!r.ok) {
      this.setTip(r.reason === 'pacts' ? '月契不足' : r.reason === 'enhanced' ? '该祝福已强化' : '');
      return;
    }
    AudioEngine.playSfx('upgrade');
    this.mode = 'idle';
    this.highlightSlots();
    this.renderWheel();
    this.refreshPacts();
    const b = blessingById(id);
    const name = b ? b.name : '';
    const effectDesc = b ? enhanceNoteFor(b.tier) : '';
    this.setResult(html`<div class="wheel-result-box enh"><b>已强化 · ${name}</b><span class="wr-desc">${effectDesc}</span></div>`);
    toast('已强化 · ' + name + ' · ' + effectDesc);
  }

  /* ---------- 操作 3 · 踢格（选择模式） ---------- */
  private enterSwap(): void {
    if (this.spinning || this.sieveActive) return;
    this.mode = this.mode === 'swap' ? 'idle' : 'swap';
    this.setTip(this.mode === 'swap'
      ? '点击要踢出的格子（3 月契）——会从轮盘外的祝福里定向请一位'
      : '');
    this.highlightSlots();
  }

  private trySwap(kickId: string): void {
    const r = swapBlessingCmd(kickId, this.slots);
    if (!r.ok) {
      this.setTip(r.reason === 'pacts' ? '月契不足' : r.reason === 'kick' ? '该格子不在轮盘上' : '');
      return;
    }
    AudioEngine.playSfx('upgrade');
    this.spinning = true; /* 阻止动画期间操作 */
    $('wheel-svg').classList.add('spinning');
    const gb = r.granted && r.granted.id ? blessingById(r.granted.id) : undefined;
    const gDesc = gb ? gb.desc : '';
    const name = r.granted?.name || '';
    this.setResult(html`<div class="wheel-result-box"><b>${name}</b> 自轮盘外降临<span class="wr-desc">${gDesc}</span></div>`);
    toast(name + ' 已降临 · ' + stripTags(gDesc));
    this._setTimeout(() => {
      this.spinning = false;
      $('wheel-svg').classList.remove('spinning');
      if (r.slots) this.slots = r.slots;
      if (!r.hasMore) {
        this._setTimeout(() => this._close(), 1200);
      } else {
        const pp = pSt().player;
        if (pp) this._setTimeout(() => this.open(pp), 700);
      }
    }, 800);
  }

  /* ---------- 操作 4 · 月轮 ---------- */
  private doMoonWheel(): void {
    if (this.spinning || this.sieveActive) return;
    const r = castMoonWheelCmd();
    if (!r.ok) { this.setTip('月契不足'); return; }
    AudioEngine.playSfx('boomCore');
    this.spinning = true;
    $('wheel-svg').classList.add('spinning');
    this.mode = 'idle';
    this.highlightSlots();
    this.setResult(html`<div class="wheel-result-box moon"><b>月轮倾落</b>——全场承受 ${r.dmg} 点蚀月伤害，月辉回涌。<br><small>生命回复至上限 80%</small></div>`);
    /* 月轮清屏视觉：全屏辉光（CSS class 由 fortune.css 提供） */
    const ov = $('levelup');
    ov.classList.add('moonwheel-flash');
    this._setTimeout(() => ov.classList.remove('moonwheel-flash'), 900);
    this._setTimeout(() => {
      this.spinning = false;
      $('wheel-svg').classList.remove('spinning');
      const pp = pSt().player;
      if (!pp) { this._close(); return; }
      if (!r.hasMore) { this._close(); return; }
      this.open(pp);
    }, 900);
  }

  /* ---------- 高亮选择模式 ---------- */
  private highlightSlots(): void {
    const svg = $('wheel-svg');
    svg.classList.toggle('selecting', this.mode !== 'idle');
    svg.classList.toggle('mode-enhance', this.mode === 'enhance');
    svg.classList.toggle('mode-swap', this.mode === 'swap');
    this.updateSelPaths();
  }

  /* ---------- 事件绑定（open 时挂一次） ---------- */
  private bound = false;
  private bind(): void {
    if (this.bound) return;
    this.bound = true;
    const on = (id: string, fn: () => void) => {
      const b = $(id);
      if (b) b.onclick = fn;
    };
    on('wa-spin', () => this.doSpin('spin'));
    on('wa-sieve', () => this.doSpin('sieve'));
    on('wa-enhance', () => this.enterEnhance());
    on('wa-swap', () => this.enterSwap());
    on('wa-moon', () => this.doMoonWheel());

    /* 操作预览：悬停按钮 → 命运之台展示该仪轨说明
       （转动中 / 候选阶段 / 结果展示时不打断，仅 preview 态可切换） */
    Object.keys(OP_PREVIEW).forEach(id => {
      const b = document.getElementById(id);
      if (!b) return;
      const body = OP_PREVIEW[id];
      b.onmouseenter = () => {
        if (this.spinning || this.sieveActive) return;
        if (this.consoleMode !== 'preview') return;
        this.renderConsole('preview', body);
      };
      b.onmouseleave = () => {
        if (this.consoleMode !== 'preview') return;
        this.renderConsole('preview', LevelUpPanel.CONSOLE_HINT);
      };
    });

    /* 轮盘点击（选择模式 / 踢格 / 筛选候选）：统一收口到 onSectorClick
       鼠标走 polarAt 极角判定；手柄/直接命中走 path 自身的 onclick（见 renderWheel） */
    const svg = $('wheel-svg');
    svg.onclick = (e: MouseEvent) => {
      if (this.spinning) return;
      const pt = this.polarAt(e.clientX, e.clientY);
      if (!pt) return;
      const idx = this.segAt(pt.deg);
      if (idx < 0) return;
      this.onSectorClick(idx);
    };

    /* 详情浮层：悬停 / 点按扇区 → 显示祝福效果（鼠标 + 触摸统一走 polarAt） */
    const showAt = (cx: number, cy: number): void => {
      if (this.spinning) return;
      const pt = this.polarAt(cx, cy);
      const idx = pt ? this.segAt(pt.deg) : -1;
      if (idx >= 0) this.showDetail(idx); else this.hideDetail();
    };
    svg.onmousemove = (e: MouseEvent) => showAt(e.clientX, e.clientY);
    svg.onmouseleave = () => this.hideDetail();
    svg.ontouchstart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) showAt(t.clientX, t.clientY);
    };
  }

  /** 屏幕坐标 → 轮盘极角（鼠标/触摸统一入口；SVG viewBox 400×400） */
  private polarAt(clientX: number, clientY: number): { deg: number } | null {
    const svg = $('wheel-svg');
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * 400 - CX;
    const y = (clientY - rect.top) / rect.height * 400 - CY;
    const dist = Math.hypot(x, y);
    if (dist > R || dist < 40) return null;
    let deg = Math.atan2(y, x) * 180 / Math.PI;
    deg = (deg + 360) % 360;
    return { deg };
  }

  /* ---------- 命运之台 · 预览模式：悬停扇区显示品质 / 名称 / 效果 ---------- */
  private showDetail(idx: number): void {
    if (this.spinning || this.sieveActive) return;
    const slot = this.slots[idx];
    if (!slot) return;
    let htmlStr: string;
    if (slot.kind === 'blank') {
      htmlStr =
        `<span class="wd-tier blank">蚀格</span>` +
        `<span class="wd-name">蚀月空转</span>` +
        `<span class="wd-desc">月亮收走祝福，留下 ${BLANK_GOLD} 枚铜钱。</span>`;
    } else {
      const b = slot.blessingId ? blessingById(slot.blessingId) : undefined;
      if (!b) return;
      const tierName = b.tier === 'legend' ? '命运' : b.tier === 'epic' ? '非凡' : '寻常';
      const enh = isEnhanced(b.id) ? '<span class="wd-enh">已强化</span>' : '';
      /* 强化后的效果展示：common 数值翻倍显示，各品质追加强化说明 */
      let descHtml = b.desc;
      let noteHtml = '';
      if (isEnhanced(b.id)) {
        if (b.tier === 'common') descHtml = doubleDescNums(b.desc);
        noteHtml = `<span class="wd-enh-note">${enhanceNoteFor(b.tier)}</span>`;
      }
      htmlStr =
        `<span class="wd-tier ${b.tier}">${tierName}</span>` +
        `<span class="wd-name">${b.name}</span>${enh}` +
        `<span class="wd-desc">${descHtml}${noteHtml}</span>`;
    }
    this.renderConsole('preview', htmlStr);
  }

  private hideDetail(): void {
    /* 仅预览模式恢复到提示；结果/三选一模式不被悬停离开打断 */
    if (this.consoleMode !== 'preview') return;
    this.renderConsole('preview', LevelUpPanel.CONSOLE_HINT);
  }

  private segAt(deg: number): number {
    for (const s of this.segs) {
      let a0 = ((s.a0 % 360) + 360) % 360;
      let a1 = ((s.a1 % 360) + 360) % 360;
      if (a0 <= a1) { if (deg >= a0 && deg <= a1) return s.i; }
      else { if (deg >= a0 || deg <= a1) return s.i; }
    }
    return -1;
  }
}
