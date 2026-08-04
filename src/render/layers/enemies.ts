/* =========================================================
   蚀月远征 · 渲染层：敌人造型注册表（精细化重制）
   每只蚀物拥有贴合名称的多层结构与流畅身体动画；
   技能预备姿态通过 e.state / e.attT 驱动。
   ========================================================= */
import { PALETTE } from '../../data/palette.js';

const TAU = Math.PI * 2;

/* 眼睛（朝向玩家，带高光与凶光） */
function enemyEye(ctx: CanvasRenderingContext2D, x: number, y: number, r?: number, color?: string): void {
  const rr = r || 2.2;
  ctx.fillStyle = color || 'rgba(0,0,0,.72)';
  ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(x + rr * 0.3, y - rr * 0.3, rr * 0.45, 0, TAU); ctx.fill();
}

export const ENEMY_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, time: number) => void> = {
  _default(ctx, e, s, wob, fa, t) {
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, wob, s, 0, TAU); ctx.fill();
    enemyEye(ctx, 0, -s * 0.1);
  },

  /* 蚀蛆：分段软体蠕虫，逐节蠕动，环节纹 + 口器 + 粘液 */
  grub(ctx, e, s, wob, fa, t, time) {
    ctx.save();
    const c = e.color;
    const ph = time * 3;
    // 三段身体（头节 + 中节 + 尾节），相位错开蠕动
    const segs = [
      { x: -s * 0.55, r: s * 0.78, ph: 0 },
      { x: -s * 1.35, r: s * 0.62, ph: 1.6 },
      { x: -s * 2.0, r: s * 0.45, ph: 3.1 },
    ];
    segs.forEach((seg, i) => {
      const yy = wob + Math.sin(ph + seg.ph) * s * 0.18;
      const rr = seg.r * (1 + Math.sin(ph * 1.4 + seg.ph) * 0.06);
      ctx.fillStyle = i === 0 ? c : shade(c, -12 * i);
      ctx.beginPath(); ctx.ellipse(seg.x, yy, rr * 1.1, rr, 0, 0, TAU); ctx.fill();
      // 环节纹
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
      for (let k = -0.6; k <= 0.6; k += 0.4) {
        ctx.beginPath(); ctx.moveTo(seg.x + k * rr * 0.7, yy - rr * 0.9);
        ctx.quadraticCurveTo(seg.x + k * rr * 1.15, yy, seg.x + k * rr * 0.7, yy + rr * 0.9); ctx.stroke();
      }
    });
    // 口器（前段开合）
    const mouth = Math.sin(ph * 2) * s * 0.06;
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.ellipse(s * 0.9, wob + mouth * 0.3, s * 0.16, s * 0.14 + Math.abs(mouth), 0, 0, TAU); ctx.fill();
    // 粘液高光
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(s * 0.25, wob - s * 0.42, s * 0.3, s * 0.14, -0.4, 0, TAU); ctx.fill();
    // 眼
    enemyEye(ctx, s * 0.55, wob - s * 0.18, s * 0.11);
    ctx.restore();
  },

  /* 噬光鼠：鼠身 + 头 + 双耳 + 长尾 + 胡须獠牙 */
  rat(ctx, e, s, wob, fa, t, time) {
    ctx.save();
    const c = e.color;
    const run = Math.sin(time * 10) * 0.9;   // 奔跑颤动
    ctx.translate(run, 0);
    // 长尾（摆动）
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.75, wob);
    ctx.quadraticCurveTo(-s * 1.8, wob - s * 0.9, -s * 2.15, wob + Math.sin(time * 7) * s * 0.35); ctx.stroke();
    // 身体（椭圆）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.95, s * 0.75, 0, 0, TAU); ctx.fill();
    // 臀部高光
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, wob - s * 0.35, s * 0.4, s * 0.22, -0.4, 0, TAU); ctx.fill();
    // 头（前伸）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(s * 0.85, wob - s * 0.12, s * 0.6, s * 0.5, -0.15, 0, TAU); ctx.fill();
    // 双耳（外耳 + 内耳）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(s * 0.5, wob - s * 0.62, s * 0.28, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 1.15, wob - s * 0.55, s * 0.24, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(232,120,130,.75)';
    ctx.beginPath(); ctx.arc(s * 0.5, wob - s * 0.62, s * 0.14, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 1.15, wob - s * 0.55, s * 0.12, 0, TAU); ctx.fill();
    // 鼻尖
    ctx.fillStyle = 'rgba(230,120,140,.85)';
    ctx.beginPath(); ctx.arc(s * 1.42, wob - s * 0.08, s * 0.1, 0, TAU); ctx.fill();
    // 胡须
    ctx.strokeStyle = 'rgba(244,236,216,.4)'; ctx.lineWidth = 0.7;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(s * 1.2, wob - s * 0.1 + i * s * 0.16);
      ctx.lineTo(s * 1.85, wob - s * 0.25 + i * s * 0.3); ctx.stroke();
    }
    // 獠牙
    ctx.fillStyle = '#fff8ea';
    ctx.beginPath(); ctx.moveTo(s * 1.3, wob + s * 0.12); ctx.lineTo(s * 1.42, wob + s * 0.3); ctx.lineTo(s * 1.24, wob + s * 0.2); ctx.closePath(); ctx.fill();
    enemyEye(ctx, s * 0.72, wob - s * 0.28, s * 0.09);
    ctx.restore();
  },

  /* 蚀甲兽：重装甲虫，三片弧甲 + 步足 + 甲缝 */
  armored(ctx, e, s, wob, fa, t, time) {
    ctx.save();
    const c = e.color;
    const breathe = 1 + Math.sin(time * 2) * 0.03;
    // 步足（四对，着地摆动）
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.2; ctx.lineCap = 'round';
    for (let i = -1.5; i <= 1.5; i += 1) {
      const ph = Math.sin(time * 6 + i * 2) * s * 0.15;
      ctx.beginPath(); ctx.moveTo(i * s * 0.55, wob + s * 0.4);
      ctx.quadraticCurveTo(i * s * 0.75, wob + s * 0.95, i * s * 1.1, wob + s * 0.85 + ph); ctx.stroke();
    }
    // 甲体（椭圆）
    const sx = s * 1.15 * breathe, sy = s * 0.95 * breathe;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, sx, sy, 0, 0, TAU); ctx.fill();
    // 背甲脊线（中央亮脊）
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.moveTo(0, wob - sy * 0.92); ctx.quadraticCurveTo(s * 0.2, wob, 0, wob + sy * 0.92); ctx.stroke();
    // 三片甲壳弧线（缝合纹）
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.ellipse(i * sx * 0.3, wob, sx * 0.52, sy * 0.86, 0, -1.1, 1.1); ctx.stroke();
    }
    // 甲片高光（左上）
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.ellipse(-sx * 0.3, wob - sy * 0.45, sx * 0.4, sy * 0.26, -0.5, 0, TAU); ctx.fill();
    // 头部（前甲）
    ctx.fillStyle = shade(c, 18);
    ctx.beginPath(); ctx.ellipse(sx * 0.72, wob - s * 0.1, s * 0.34, s * 0.3, 0.1, 0, TAU); ctx.fill();
    enemyEye(ctx, sx * 0.85, wob - s * 0.14, s * 0.08);
    ctx.restore();
  },

  /* 噬光翼：翼魔，双片蝙蝠翼扑扇 + 尖耳獠牙 */
  wing(ctx, e, s, wob, fa, t, time) {
    ctx.save();
    const c = e.color;
    const flap = Math.sin(time * 5) * 0.35;
    // 翼（双片，膜状：外缘锯齿 + 翼骨）
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * flap * 0.6);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.55, wob - s * 0.1);
      ctx.quadraticCurveTo(side * s * 1.8, wob - s * 1.15, side * s * 2.4, wob - s * 0.9);
      ctx.lineTo(side * s * 2.1, wob - s * 0.35);
      ctx.quadraticCurveTo(side * s * 1.6, wob - s * 0.15, side * s * 1.25, wob + s * 0.05);
      ctx.lineTo(side * s * 0.95, wob + s * 0.28);
      ctx.quadraticCurveTo(side * s * 0.6, wob + s * 0.05, side * s * 0.55, wob - s * 0.1);
      ctx.closePath(); ctx.fill();
      // 翼骨
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = s * 0.1;
      ctx.beginPath(); ctx.moveTo(side * s * 0.55, wob - s * 0.1);
      ctx.quadraticCurveTo(side * s * 1.7, wob - s * 0.95, side * s * 2.35, wob - s * 0.85); ctx.stroke();
      ctx.restore();
    }
    // 身体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.8, s * 0.72, 0, 0, TAU); ctx.fill();
    // 尖耳
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, wob - s * 0.62); ctx.lineTo(-s * 0.55, wob - s * 1.15); ctx.lineTo(-s * 0.02, wob - s * 0.78); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.3, wob - s * 0.62); ctx.lineTo(s * 0.55, wob - s * 1.15); ctx.lineTo(s * 0.02, wob - s * 0.78); ctx.closePath(); ctx.fill();
    // 獠牙
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath(); ctx.moveTo(-s * 0.32, wob + s * 0.3); ctx.lineTo(-s * 0.42, wob + s * 0.62); ctx.lineTo(-s * 0.2, wob + s * 0.42); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.32, wob + s * 0.3); ctx.lineTo(s * 0.42, wob + s * 0.62); ctx.lineTo(s * 0.2, wob + s * 0.42); ctx.closePath(); ctx.fill();
    // 腹部纹
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-s * 0.28, wob + s * 0.25 + i * s * 0.18);
      ctx.quadraticCurveTo(0, wob + s * 0.42 + i * s * 0.18, s * 0.28, wob + s * 0.25 + i * s * 0.18); ctx.stroke();
    }
    enemyEye(ctx, s * 0.14, wob - s * 0.2, s * 0.1, '#3d1216');
    enemyEye(ctx, -s * 0.2, wob - s * 0.15, s * 0.08, '#3d1216');
    ctx.restore();
  },

  /* 狂角魔：恶魔冲撞者，双弯角 + 怒目 + 鼻息（冲锋低头） */
  charger(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const dashing = e.state === 'dashMove';           // 冲锋姿态：低头前倾
    const lean = dashing ? 0.45 : Math.sin(time * 2) * 0.04;
    ctx.save();
    ctx.rotate(lean * (dashing ? Math.sign(Math.cos(fa)) || 1 : 1));
    // 身体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, s, s * 0.85, 0, 0, TAU); ctx.fill();
    // 胸甲亮纹
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath(); ctx.ellipse(-s * 0.2, wob - s * 0.35, s * 0.35, s * 0.2, -0.5, 0, TAU); ctx.fill();
    // 面部（暗色）
    ctx.fillStyle = '#2c1a18';
    ctx.beginPath(); ctx.ellipse(s * 0.42, wob - s * 0.12, s * 0.55, s * 0.5, 0, 0, TAU); ctx.fill();
    // 双弯角（恶魔羊角）
    ctx.strokeStyle = '#f4e9d0'; ctx.lineWidth = s * 0.18; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * s * 0.3, wob - s * 0.55);
      ctx.quadraticCurveTo(side * s * 0.75, wob - s * 1.35, side * s * 0.2, wob - s * 1.55); ctx.stroke();
      // 角尖
      ctx.fillStyle = '#f4e9d0';
      ctx.beginPath(); ctx.arc(side * s * 0.2, wob - s * 1.55, s * 0.09, 0, TAU); ctx.fill();
    }
    // 鼻息（冲锋时喷出）
    if (dashing) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#f0e8dc';
      for (let i = 0; i < 3; i++) {
        const nx = s * 0.85 + i * s * 0.3, ny = wob + s * 0.15 - i * s * 0.1;
        ctx.beginPath(); ctx.arc(nx, ny, s * 0.12 - i * 0.02, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 怒目
    enemyEye(ctx, s * 0.28, wob - s * 0.38, s * 0.13, '#2a0c0c');
    enemyEye(ctx, s * 0.62, wob - s * 0.3, s * 0.11, '#2a0c0c');
    // 尾
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.85, wob + s * 0.2);
    ctx.quadraticCurveTo(-s * 1.6, wob + s * 0.9, -s * 1.35, wob + s * 0.3 + Math.sin(time * 5) * s * 0.2); ctx.stroke();
    ctx.restore();
  },

  /* 蚀涎魔：毒囊兽，呼吸鼓胀 + 囊内毒光 + 喙管（喷吐前膨胀） */
  spitter(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const charging = e.stateT < 0.8 && e.ranged;       // 喷吐前蓄力
    const breath = 1 + 0.07 * Math.sin(time * 3) + (charging ? 0.1 : 0);
    // 毒囊身体（椭圆，呼吸鼓胀）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob - s * 0.05, s * 1.0 * breath, s * 0.92 * breath, 0, 0, TAU); ctx.fill();
    // 囊内毒光（随蓄力增强）
    const glow = 0.18 + (charging ? 0.3 : 0) + 0.1 * Math.sin(time * 4);
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#b6ffd8';
    ctx.beginPath(); ctx.ellipse(0, wob, s * 0.5 * breath, s * 0.42 * breath, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // 体表蚀斑
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.arc(-s * 0.36, wob + s * 0.34, s * 0.18, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, wob + s * 0.45, s * 0.12, 0, TAU); ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath(); ctx.ellipse(-s * 0.3, wob - s * 0.4, s * 0.3, s * 0.16, -0.5, 0, TAU); ctx.fill();
    // 喙管（基准朝右，外层旋转负责整体朝向）
    ctx.save();
    const beakLen = charging ? 1.85 : 1.55;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.16);
    ctx.quadraticCurveTo(s * beakLen * 0.75, -s * 0.3, s * beakLen, -s * 0.06);
    ctx.lineTo(s * beakLen, s * 0.16);
    ctx.quadraticCurveTo(s * beakLen * 0.75, -s * 0.02, s * 0.5, s * 0.24);
    ctx.closePath(); ctx.fill();
    // 喙口毒涎（蓄力时膨胀发光）
    const g2 = charging ? 1 : 0.6;
    ctx.fillStyle = '#eafff4';
    ctx.globalAlpha = g2;
    ctx.beginPath(); ctx.ellipse(s * beakLen, s * 0.05, s * 0.22, s * 0.12, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.35 + 0.5 * Math.sin(time * 6);
    ctx.fillStyle = '#b6ffd8';
    ctx.beginPath(); ctx.arc(s * beakLen, s * 0.05, s * 0.16 + (charging ? 0.08 : 0), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    enemyEye(ctx, -s * 0.2, wob - s * 0.3, s * 0.09);
  },

  /* 血疱魔：主疱 + 群疱搏动（错相）+ 血管 */
  splitter(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    // 主疱（搏动）
    const mainP = 1 + 0.14 * Math.sin(time * 3);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, wob, s * mainP, 0, TAU); ctx.fill();
    // 群疱（错相搏动，内部透光）
    [[0.55, -0.35, 0.34, 0], [-0.55, -0.2, 0.3, 2.1], [0.3, 0.55, 0.24, 4.2], [-0.4, 0.5, 0.2, 1.2]].forEach(([dx, dy, r, ph]) => {
      const pulse = 1 + 0.16 * Math.sin(time * 3.4 + ph);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(dx * s, dy * s + wob, r * s * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.arc(dx * s + r * s * 0.3, dy * s + wob - r * s * 0.3, r * s * 0.4 * pulse, 0, TAU); ctx.fill();
    });
    // 血管网（连接小疱）
    ctx.strokeStyle = 'rgba(120,20,40,.45)'; ctx.lineWidth = s * 0.09;
    ctx.beginPath(); ctx.moveTo(0, wob); ctx.quadraticCurveTo(s * 0.35, wob - s * 0.1, s * 0.55, wob - s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, wob); ctx.quadraticCurveTo(-s * 0.3, wob + s * 0.05, -s * 0.55, wob - s * 0.2); ctx.stroke();
    // 脓液高光
    ctx.fillStyle = 'rgba(255,200,200,.3)';
    ctx.beginPath(); ctx.arc(0, wob - s * 0.25, s * 0.18, 0, TAU); ctx.fill();
    enemyEye(ctx, 0, wob - s * 0.1, s * 0.09, '#3d0c12');
  },

  /* 影行者：旋转暗雾 + 猩红双眼 + 触手残影 */
  shadow(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    ctx.globalAlpha = 0.75;
    // 旋转暗雾（多层涟漪）
    for (let layer = 0; layer < 3; layer++) {
      const rr = s * (1 + layer * 0.42);
      ctx.globalAlpha = 0.34 - layer * 0.08;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-rr, wob + Math.sin(time * 2 + layer * 1.8) * s * 0.2);
      for (let i = 1; i <= 16; i++) {
        const a = i / 16 * TAU;
        const r2 = rr * (1 + Math.sin(time * 2.4 + layer * 2.2 + i * 1.7) * 0.14);
        ctx.lineTo(Math.cos(a) * r2, wob + Math.sin(a) * rr * 0.8);
      }
      ctx.closePath(); ctx.fill();
    }
    // 触手残影（摆动）
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = -0.7 + i * 0.7;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * s, wob + Math.sin(a) * s * 0.8);
      ctx.quadraticCurveTo(Math.cos(a) * s * 1.7, wob + Math.sin(a + time * 3 + i) * s * 1.2, Math.cos(a) * s * 2.1, wob + Math.sin(a + time * 3.4 + i) * s * 1.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 猩红双眼
    ctx.fillStyle = '#ff4a5a';
    ctx.shadowColor = '#ff4a5a'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-s * 0.3, wob - s * 0.15, s * 0.17, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, wob - s * 0.15, s * 0.17, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  },

  /* 巨噬者：巨口（上下颚 + 尖牙列）+ 独角 + 单眼 */
  giant(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    const gs = s * (1 + 0.03 * Math.sin(time * 2));
    // 身体（粗壮）
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, wob, gs * 1.05, gs * 0.95, 0, 0, TAU); ctx.fill();
    // 甲纹
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = gs * 0.08;
    ctx.beginPath(); ctx.arc(0, wob, gs * 0.6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, wob, gs * 0.38, 0.6, 2.6); ctx.stroke();
    // 巨口（占据下盘，开合）
    const open = 0.22 + Math.abs(Math.sin(time * 1.6)) * 0.12;
    ctx.fillStyle = '#120806';
    ctx.beginPath(); ctx.ellipse(0, wob + gs * 0.38, gs * 0.62, gs * open, 0, 0, TAU); ctx.fill();
    // 尖牙列（上下颚）
    ctx.fillStyle = '#fdf6ea';
    for (let i = -2; i <= 2; i++) {
      const bx = i * gs * 0.18;
      // 上牙
      ctx.beginPath(); ctx.moveTo(bx - gs * 0.05, wob + gs * 0.38 - gs * open);
      ctx.lineTo(bx, wob + gs * 0.38 - gs * open - gs * 0.3); ctx.lineTo(bx + gs * 0.05, wob + gs * 0.38 - gs * open); ctx.closePath(); ctx.fill();
      // 下牙
      ctx.beginPath(); ctx.moveTo(bx - gs * 0.05, wob + gs * 0.38 + gs * open);
      ctx.lineTo(bx, wob + gs * 0.38 + gs * open + gs * 0.28); ctx.lineTo(bx + gs * 0.05, wob + gs * 0.38 + gs * open); ctx.closePath(); ctx.fill();
    }
    // 独角
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath(); ctx.moveTo(0, wob - gs * 0.9); ctx.lineTo(gs * 0.1, wob - gs * 1.75); ctx.lineTo(-gs * 0.1, wob - gs * 0.9); ctx.closePath(); ctx.fill();
    // 单眼（巨瞳）
    ctx.fillStyle = '#ffd54a';
    ctx.shadowColor = '#ffd54a'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, wob - gs * 0.35, gs * 0.16, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1208';
    ctx.beginPath(); ctx.arc(0, wob - gs * 0.35, gs * 0.07, 0, TAU); ctx.fill();
  },

  /* 自爆魔：体内火光（随引信增强）+ 膨胀 + 裂纹 */
  bomber(ctx, e, s, wob, fa, t, time) {
    const c = e.color;
    // 自爆进度（由敌人血量推算：血越低越膨胀）
    const hpR = e.maxHp ? 1 - clamp(e.hp / e.maxHp, 0, 1) : 0;
    const bs = s * (1 + hpR * 0.18 + 0.06 * Math.sin(time * 4));
    // 身体
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, wob, bs, 0, TAU); ctx.fill();
    // 裂纹（随自爆进度扩散）
    ctx.strokeStyle = 'rgba(60,20,10,.5)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.4;
      ctx.beginPath(); ctx.moveTo(0, wob);
      ctx.lineTo(Math.cos(a) * bs * (0.6 + hpR * 0.5), wob + Math.sin(a) * bs * (0.6 + hpR * 0.5)); ctx.stroke();
    }
    // 内部火光（核心，随自爆增强脉动）
    const fireP = 0.5 + hpR * 0.4 + Math.sin(time * 7) * (0.08 + hpR * 0.1);
    ctx.fillStyle = '#ffd54a';
    ctx.shadowColor = '#ff7a3c'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, wob, bs * fireP, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2cc';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, wob, bs * fireP * 0.5, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // 引信（火花闪烁）
    ctx.strokeStyle = c; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -bs); ctx.quadraticCurveTo(bs * 0.34, -bs * 1.4, bs * 0.12, -bs * 1.75); ctx.stroke();
    const spark = 1 + Math.sin(time * 14) * 0.4;
    ctx.fillStyle = '#fff2cc';
    ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(bs * 0.12, -bs * 1.75, bs * 0.13 * spark, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    enemyEye(ctx, bs * 0.2, wob - bs * 0.15, bs * 0.1, '#3d1216');
  },
};

/* 辅助：颜色明暗 */
function shade(hex: string, amt: number): string {
  const c = String(hex || '#888').replace('#', '');
  if (c.length < 6) return hex;
  const r = Math.max(0, Math.min(255, parseInt(c.substr(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.substr(2, 2), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.substr(4, 2), 16) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }

export function drawEnemyBody(ctx: CanvasRenderingContext2D, e: any, s: number, wob: number, fa: number, t: number, flash?: number, time?: number): void {
  const fn: any = ENEMY_SHAPES[e.type || ''] || ENEMY_SHAPES._default;
  fn(ctx, e, s, wob, fa, t, time || 0);
  if (flash != null && flash > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, flash * 5);
    ctx.beginPath(); ctx.arc(0, wob, s + 1, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
