import { describe, it, expect } from 'vitest';
import { EntityPool, E_SCHEMA } from '../ecs/entity_pool.js';
import type { EnemyInstance } from '../types/core.d.ts';

describe('EntityPool', () => {
  it('should create a pool with correct size', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    expect(pool.count).toBe(0);
    expect(pool._maxSize).toBe(10);
    expect(pool._stride).toBe(E_SCHEMA.length);
  });

  it('should add an entity and increment count', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const view = pool.add();
    expect(pool.count).toBe(1);
    expect(view).toBeDefined();
    expect(view.x).toBe(0);
    expect(view.hp).toBe(0);
  });

  it('should add entity with data via addWith', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const view = pool.addWith({ x: 100, y: 200, hp: 50, dead: 0, color: 'red' });
    expect(pool.count).toBe(1);
    expect(view.x).toBe(100);
    expect(view.y).toBe(200);
    expect(view.hp).toBe(50);
    // 非 schema 属性应设置为视图属性
    expect(view.color).toBe('red');
  });

  it('should set fields on existing entity', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const view = pool.add();
    pool.setFields(0, { x: 42, hp: 100 });
    expect(view.x).toBe(42);
    expect(view.hp).toBe(100);
  });

  it('should get/set via TypedArray directly', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    pool.addWith({ x: 10, y: 20 });
    expect(pool.get(0, 'x')).toBe(10);
    pool.set(0, 'x', 99);
    expect(pool.get(0, 'x')).toBe(99);
  });

  it('should compact dead entities', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const arr: EnemyInstance[] = [];
    pool.addWith({ dead: 0, x: 1 });
    pool.addWith({ dead: 1, x: 2 });
    pool.addWith({ dead: 0, x: 3 });
    pool.addWith({ dead: 1, x: 4 });
    pool.addWith({ dead: 0, x: 5 });
    // 初始填充数组
    for (let i = 0; i < pool.count; i++) arr[i] = pool.view(i);
    pool.compact(arr, e => e.dead === 1);
    expect(pool.count).toBe(3);
    expect(arr.length).toBe(3);
    expect(arr[0].x).toBe(1);
    expect(arr[1].x).toBe(3);
    expect(arr[2].x).toBe(5);
  });

  it('should reset pool to zero', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    pool.addWith({ x: 1, y: 2 });
    pool.addWith({ x: 3, y: 4 });
    expect(pool.count).toBe(2);
    pool.reset();
    expect(pool.count).toBe(0);
  });

  it('should handle multiple addWith calls correctly', () => {
    const pool = new EntityPool<EnemyInstance>(5, E_SCHEMA);
    const v1 = pool.addWith({ x: 10, hp: 100, type: 'grub' });
    const v2 = pool.addWith({ x: 20, hp: 200, type: 'rat' });
    expect(pool.count).toBe(2);
    expect(v1.x).toBe(10);
    expect(v1.hp).toBe(100);
    expect(v1.type).toBe('grub');
    expect(v2.x).toBe(20);
    expect(v2.hp).toBe(200);
    expect(v2.type).toBe('rat');
  });

  it('should reuse view indices after compaction', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const arr: EnemyInstance[] = [];
    const v1 = pool.addWith({ dead: 0, x: 1 });
    const v2 = pool.addWith({ dead: 1, x: 2 });
    const v3 = pool.addWith({ dead: 0, x: 3 });
    for (let i = 0; i < pool.count; i++) arr[i] = pool.view(i);
    pool.compact(arr, e => e.dead === 1);
    // 压缩后 v1 和 v3 应该存活
    expect(arr[0].x).toBe(1);
    expect(arr[1].x).toBe(3);
    // 视图索引应更新
    expect(arr[0]._idx).toBe(0);
    expect(arr[1]._idx).toBe(1);
  });

  it('should preserve non-schema properties after compaction', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const arr: EnemyInstance[] = [];
    // 添加3个实体，各有不同的 type/color/state
    pool.addWith({ dead: 0, x: 10, type: 'grub', color: '#ff0000', state: 'chase' });
    pool.addWith({ dead: 1, x: 20, type: 'rat', color: '#00ff00', state: 'flee' });  // 会死
    pool.addWith({ dead: 0, x: 30, type: 'armored', color: '#0000ff', state: 'idle' });
    for (let i = 0; i < pool.count; i++) arr[i] = pool.view(i);
    // 压缩掉 dead=1 的实体，这会触发数据迁移（从 r=2 移到 w=1）
    pool.compact(arr, e => e.dead === 1);
    expect(pool.count).toBe(2);
    // 第一个存活实体：grub
    expect(arr[0].x).toBe(10);
    expect(arr[0].type).toBe('grub');
    expect(arr[0].color).toBe('#ff0000');
    expect(arr[0].state).toBe('chase');
    // 第二个存活实体：armored（被迁移到索引1）
    expect(arr[1].x).toBe(30);
    expect(arr[1].type).toBe('armored');
    expect(arr[1].color).toBe('#0000ff');
    expect(arr[1].state).toBe('idle');
  });

  it('should clear stale non-schema properties when slot is reused', () => {
    const pool = new EntityPool<EnemyInstance>(10, E_SCHEMA);
    const arr: EnemyInstance[] = [];
    // 先填满槽位 0,1,2
    const v0 = pool.addWith({ dead: 0, x: 1, type: 'a', color: 'red' });
    const v1 = pool.addWith({ dead: 1, x: 2, type: 'b', color: 'green' });  // 会死
    const v2 = pool.addWith({ dead: 0, x: 3, type: 'c', color: 'blue' });
    for (let i = 0; i < pool.count; i++) arr[i] = pool.view(i);
    // 压缩后：v0 在 0，v2 被移到 1
    pool.compact(arr, e => e.dead === 1);
    // 新添加实体，复用槽位 2（原 v1 的位置）
    const v3 = pool.addWith({ dead: 0, x: 4, type: 'd', color: 'yellow' });
    arr.push(v3);
    // v3 是新分配的，不应有残留的 'b'/'green' 属性
    expect(v3.type).toBe('d');
    expect(v3.color).toBe('yellow');
    expect(v3.x).toBe(4);
  });

  it('should auto-grow when adding beyond maxSize', () => {
    const pool = new EntityPool<EnemyInstance>(3, E_SCHEMA);
    const arr: EnemyInstance[] = [];
    // 填满 3 个槽位
    for (let i = 0; i < 3; i++) {
      const v = pool.addWith({ dead: 0, x: i, type: 't' + i });
      arr.push(v);
    }
    // 第 4 个触发扩容
    const v4 = pool.addWith({ dead: 0, x: 99, type: 't4' });
    arr.push(v4);
    expect(pool.count).toBe(4);
    expect(pool._maxSize).toBeGreaterThanOrEqual(4);
    // 扩容后旧视图数据与新视图均正常
    expect(pool.view(0).x).toBe(0);
    expect(v4.x).toBe(99);
    expect(v4.type).toBe('t4');
    // 标记第 2 个为死亡：compact 走数据迁移（w !== r）分支
    arr[1].dead = 1;
    pool.compact(arr, e => e.dead === 1);
    expect(pool.count).toBe(3);
    expect(arr.length).toBe(3);
    // x=2 从槽位 2 迁到 1，x=99 从槽位 3 迁到 2
    expect(arr[0].x).toBe(0);
    expect(arr[1].x).toBe(2);
    expect(arr[1].type).toBe('t2');
    expect(arr[2].x).toBe(99);
    expect(arr[2].type).toBe('t4');
  });
});
