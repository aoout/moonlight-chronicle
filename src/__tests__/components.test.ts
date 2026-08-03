import { describe, it, expect } from 'vitest';
import {
  Position, Health, Renderable, Velocity, Combat, Timer, Status,
  Enemy, Projectile, Drop, Particle, Phantom, Aura, createEntity,
} from '../ecs/components.js';

describe('Component factories', () => {
  it('Position should create position component', () => {
    const c = Position(10, 20);
    expect(c.x).toBe(10);
    expect(c.y).toBe(20);
  });

  it('Health should create health component with default maxHp', () => {
    const c = Health(100);
    expect(c.hp).toBe(100);
    expect(c.maxHp).toBe(100);
  });

  it('Health should create health component with explicit maxHp', () => {
    const c = Health(50, 200);
    expect(c.hp).toBe(50);
    expect(c.maxHp).toBe(200);
  });

  it('Renderable should create renderable component', () => {
    const c = Renderable('#ff0000', 16);
    expect(c.color).toBe('#ff0000');
    expect(c.size).toBe(16);
    expect(c.shape).toBeUndefined();
  });

  it('Renderable should include shape when provided', () => {
    const c = Renderable('#00ff00', 8, 'circle');
    expect(c.shape).toBe('circle');
  });

  it('Velocity should create velocity component', () => {
    const c = Velocity(100, -50);
    expect(c.vx).toBe(100);
    expect(c.vy).toBe(-50);
  });

  it('Combat should create combat component', () => {
    const c = Combat(25);
    expect(c.dmg).toBe(25);
    expect(c.pierce).toBeUndefined();
    expect(c.crit).toBeUndefined();
  });

  it('Combat should include optional pierce and crit', () => {
    const c = Combat(25, 3, 0.5);
    expect(c.pierce).toBe(3);
    expect(c.crit).toBe(0.5);
  });

  it('Timer should create timer component', () => {
    const c = Timer(0.5);
    expect(c.t).toBe(0.5);
    expect(c.life).toBeUndefined();
    expect(c.max).toBeUndefined();
  });

  it('Timer should include life and max when provided', () => {
    const c = Timer(0, 2.0);
    expect(c.t).toBe(0);
    expect(c.life).toBe(2.0);
    expect(c.max).toBe(2.0);
  });

  it('Status should create status component with all fields', () => {
    const c = Status(0.3, 1.0, 5, 0.1);
    expect(c.slow).toBe(0.3);
    expect(c.stun).toBe(1.0);
    expect(c.bleed).toBe(5);
    expect(c.flash).toBe(0.1);
  });

  it('Status should skip undefined fields', () => {
    const c = Status(0.5);
    expect(c.slow).toBe(0.5);
    expect(c.stun).toBeUndefined();
    expect(c.bleed).toBeUndefined();
    expect(c.flash).toBeUndefined();
  });

  it('Enemy should create enemy component', () => {
    const c = Enemy('grub');
    expect(c.type).toBe('grub');
    expect(c.boss).toBe(false);
  });

  it('Enemy should set boss flag', () => {
    const c = Enemy('boss', true);
    expect(c.boss).toBe(true);
  });

  it('Projectile should create projectile component', () => {
    const c = Projectile('arrow');
    expect(c.wId).toBe('arrow');
    expect(c.range).toBeUndefined();
    expect(c.r).toBeUndefined();
  });

  it('Projectile should include optional radius', () => {
    const c = Projectile('fire', 300, 200, 8);
    expect(c.r).toBe(8);
  });

  it('Drop should create drop component', () => {
    const c = Drop('gold', 50);
    expect(c.kind).toBe('gold');
    expect(c.amount).toBe(50);
    expect(c.t).toBe(0);
    expect(c.take).toBe(false);
  });

  it('Particle should create particle component', () => {
    const c = Particle(10, -5, 0.5, '#fff', 3);
    expect(c.vx).toBe(10);
    expect(c.vy).toBe(-5);
    expect(c.life).toBe(0.5);
    expect(c.color).toBe('#fff');
    expect(c.size).toBe(3);
    expect(c.t).toBe(0);
  });

  it('Phantom should create phantom component', () => {
    const c = Phantom(50, 3);
    expect(c.dmg).toBe(50);
    expect(c.max).toBe(3);
    expect(c.fireT).toBe(0);
    expect(c.t).toBe(0);
  });

  it('Aura should create aura component', () => {
    const c = Aura(0.2, 10, 200);
    expect(c.auraSlow).toBe(0.2);
    expect(c.auraDmg).toBe(10);
    expect(c.auraRange).toBe(200);
  });

  it('Aura should skip undefined fields', () => {
    const c = Aura(0.3);
    expect(c.auraSlow).toBe(0.3);
    expect(c.auraDmg).toBeUndefined();
    expect(c.auraRange).toBeUndefined();
  });
});

describe('createEntity', () => {
  it('should merge multiple components into one object', () => {
    const entity = createEntity(
      Position(10, 20),
      Health(100),
      Renderable('red', 16),
    );
    expect(entity.x).toBe(10);
    expect(entity.y).toBe(20);
    expect(entity.hp).toBe(100);
    expect(entity.color).toBe('red');
    expect(entity.size).toBe(16);
  });

  it('should override earlier fields with later ones', () => {
    const entity = createEntity(
      { x: 1, y: 2 },
      { x: 99 },
    );
    expect(entity.x).toBe(99);
    expect(entity.y).toBe(2);
  });

  it('should handle empty component list', () => {
    const entity = createEntity();
    expect(Object.keys(entity).length).toBe(0);
  });
});