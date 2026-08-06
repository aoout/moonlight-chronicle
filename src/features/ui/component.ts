/* =========================================================
   蚀月远征 · UI 组件契约
   面板类只需实现 render()，返回 HTML 字符串或 DOM 节点；
   挂载 / 显示 / 关闭由各面板自己按需实现（它们的生命周期差异很大，
   强行抽公共基类反而增加耦合）。

   历史注记：这里曾有一套 mount / unmount / setProps / onMount /
   onUnmount 的迷你组件框架，四个子类无一使用，已移除。
   ========================================================= */

export abstract class Component<P = any> {
  /** 返回 HTML 字符串或 DOM 节点 */
  abstract render(props?: P): string | HTMLElement | DocumentFragment;
}
