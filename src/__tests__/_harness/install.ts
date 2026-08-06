/* =========================================================
   0 号 setup · 全局接管（必须最先执行）
   =========================================================

   为什么必须独立成一个文件？

   ESM 的 import 会被提升：一个模块里所有 import 的依赖图，都在该模块
   自身第一行代码执行**之前**就求值完毕。而 `engine/util/utils.ts` 里
   写的是

       export const RNG = Math.random;      // 求值那一刻捕获函数引用

   所以只要 setup 文件顶部 import 了任何一条能走到 utils.ts 的业务模块，
   RNG 捕获到的就是**原生** Math.random —— 后面再怎么赋值都晚了，
   概率分支全部回到抽奖状态，而且表面上「测试还是绿的」，只是偶尔红。

   （这个坑真实发生过：setup.ts 为了复位状态机加了一行
     `import { sm } from '../engine/core/states.js'`，
    整套确定性随机当场失效，combat 用例每次跑挂 4~8 个不等。）

   因此本文件的铁律：**只允许 import 零业务依赖的 harness 模块**。
   任何 `../../engine/**`、`../../domain/**` 的 import 都是 bug。
   `_rng_takeover.test.ts` 会守住这条线。
   ========================================================= */
import { deterministicRandom } from './random.js';
import { installHostGlobals } from './host.js';

Math.random = deterministicRandom;
installHostGlobals();
