/* =========================================================
   蚀月远征 · Headless 压测：统计学工具
   ---------------------------------------------------------
   为什么不能只报平均值：

   帧时间是**右偏长尾**分布 —— 偶发的 GC、缓存重建会拉出几个
   离群大值，把均值抬高，但玩家实际感受到的是中位数附近的手感
   加上 P95/P99 的卡顿。只看均值既高估了平常态，又低估了卡顿。

   更要命的是：两次跑分差 5%，到底是优化生效了，还是机器在抖？
   没有置信区间就无法回答，于是"性能优化"退化成看心情解读数字。
   这里用 bootstrap 重采样给出区间估计，并对两组样本做差值检验，
   让「提升 12%」这句话带上「且统计显著」的资格。
   ========================================================= */

/** 升序排序副本 */
function sorted(a) {
  return Float64Array.from(a).sort();
}

/** 线性插值分位数 */
export function quantile(sortedArr, q) {
  const n = sortedArr.length;
  if (n === 0) return 0;
  if (n === 1) return sortedArr[0];
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (pos - lo);
}

function mean(a) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}

/**
 * 计算一组样本的完整统计画像。
 * @param {number[]} samples
 * @param {{bootstrap?: number, seed?: number}} [opts]
 */
export function describe(samples, opts = {}) {
  const n = samples.length;
  if (n === 0) {
    return {
      n: 0, min: 0, max: 0, mean: 0, median: 0,
      p75: 0, p95: 0, p99: 0, stdDev: 0, mad: 0, cv: 0,
      ci95: [0, 0], meanCi95: [0, 0],
    };
  }
  const s = sorted(samples);
  const m = mean(s);
  const median = quantile(s, 0.5);

  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (s[i] - m) ** 2;
  // 样本方差用 n-1（无偏），单帧样本量大时差别不大，但小样本下重要
  const stdDev = n > 1 ? Math.sqrt(varSum / (n - 1)) : 0;

  // 中位绝对偏差：对离群值稳健的离散度
  const devs = new Float64Array(n);
  for (let i = 0; i < n; i++) devs[i] = Math.abs(s[i] - median);
  const mad = quantile(devs.sort(), 0.5);

  const bootN = opts.bootstrap ?? 1000;
  const meanCi95 = bootstrapCI(s, mean, bootN, opts.seed ?? 0x9e3779b9);
  const medianCi95 = bootstrapCI(s, (a) => quantile(sorted(a), 0.5), bootN, opts.seed ?? 0x9e3779b9);

  return {
    n,
    min: s[0],
    max: s[n - 1],
    mean: m,
    median,
    p75: quantile(s, 0.75),
    p95: quantile(s, 0.95),
    p99: quantile(s, 0.99),
    stdDev,
    mad,
    /** 变异系数：衡量本次测量自身的稳定性，>0.3 说明环境噪声大，结论要打折 */
    cv: m !== 0 ? stdDev / m : 0,
    /** 中位数的 95% 置信区间 */
    ci95: medianCi95,
    /** 均值的 95% 置信区间 */
    meanCi95,
  };
}

/* ---------- 确定性随机（可复现的 bootstrap） ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Bootstrap 置信区间。
 * 不假设正态分布 —— 帧时间明显不正态，t 分布区间会系统性偏窄。
 */
export function bootstrapCI(samples, statFn, iterations = 1000, seed = 1) {
  const n = samples.length;
  if (n < 2) return [samples[0] ?? 0, samples[0] ?? 0];
  const rnd = mulberry32(seed);
  const stats = new Float64Array(iterations);
  const buf = new Float64Array(n);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) buf[i] = samples[(rnd() * n) | 0];
    stats[it] = statFn(buf);
  }
  stats.sort();
  return [quantile(stats, 0.025), quantile(stats, 0.975)];
}

/**
 * 两组样本的差异检验（bootstrap 差值置信区间）。
 *
 * 返回的 `significant` 表示：改进百分比的 95% 置信区间不跨越 0，
 * 也就是这次差异不太可能只是噪声。这是把"看起来快了"升级成
 * "可以写进报告"的那道门槛。
 *
 * @param {number[]} baseline 基线样本
 * @param {number[]} current  当前样本
 * @param {'median'|'mean'} metric 用哪个中心统计量比较
 */
export function compareSamples(baseline, current, metric = 'median') {
  const statFn = metric === 'mean'
    ? mean
    : (a) => quantile(sorted(a), 0.5);

  const b0 = statFn(Float64Array.from(baseline));
  const c0 = statFn(Float64Array.from(current));
  // 帧时间越小越好：改进率 = (基线 - 当前) / 基线
  const improvePct = b0 === 0 ? 0 : ((b0 - c0) / b0) * 100;

  const iterations = 2000;
  const rndB = mulberry32(0xabcdef);
  const rndC = mulberry32(0x123456);
  const nb = baseline.length, nc = current.length;
  const bufB = new Float64Array(nb), bufC = new Float64Array(nc);
  const diffs = new Float64Array(iterations);

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nb; i++) bufB[i] = baseline[(rndB() * nb) | 0];
    for (let i = 0; i < nc; i++) bufC[i] = current[(rndC() * nc) | 0];
    const bs = statFn(bufB), cs = statFn(bufC);
    diffs[it] = bs === 0 ? 0 : ((bs - cs) / bs) * 100;
  }
  diffs.sort();
  const lo = quantile(diffs, 0.025);
  const hi = quantile(diffs, 0.975);

  return {
    baselineStat: b0,
    currentStat: c0,
    improvePct,
    /** 改进百分比的 95% 置信区间 */
    ci95: [lo, hi],
    /** 区间不含 0 → 差异statistically显著 */
    significant: (lo > 0 && hi > 0) || (lo < 0 && hi < 0),
    direction: improvePct > 0 ? 'faster' : improvePct < 0 ? 'slower' : 'same',
  };
}

/**
 * 剔除预热残留造成的前段离群值。
 * 只掐头不去尾 —— 长尾恰恰是我们要测的卡顿，不能当噪声抹掉。
 */
export function trimWarmup(samples, ratio = 0.05) {
  const cut = Math.floor(samples.length * ratio);
  return cut > 0 ? samples.slice(cut) : samples;
}
