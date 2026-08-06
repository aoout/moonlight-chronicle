import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  settingsState, PRESETS, applyPreset, setSetting, matchPreset,
  loadSettings, persistSettings,
} from '../../state/settings.js';

/* Node 测试环境无 localStorage，注入最小实现 */
const memStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memStore.set(k, v); },
  removeItem: (k: string) => { memStore.delete(k); },
  clear: () => { memStore.clear(); },
});

describe('辉光调校 · 设置状态', () => {
  beforeEach(() => { localStorage.clear(); });

  it('默认档位为皎月(high)且与预设完全匹配', () => {
    const s = settingsState.state;
    expect(s.preset).toBe('high');
    expect(s.renderScale).toBe(1);
    expect(s.fpsLimit).toBe(60);
    expect(matchPreset()).toBe('high');
  });

  it('应用蚀辉(low)档位后全部细项随之切换', () => {
    applyPreset('low');
    const s = settingsState.state;
    expect(s.renderScale).toBe(0.5);
    expect(s.particleDensity).toBe(0.5);
    expect(s.glowFx).toBe(false);
    expect(s.shake).toBe(false);
    expect(s.dmgNumbers).toBe(false);
    expect(s.bgDetail).toBe(false);
    expect(s.fpsLimit).toBe(30);
    expect(matchPreset()).toBe('low');
  });

  it('单独调校细项后档位变为自定义，再逐项复原可回到预设', () => {
    applyPreset('high');
    setSetting('renderScale', 0.75);
    expect(settingsState.get('preset')).toBe('custom');
    expect(matchPreset()).toBe('custom');
    setSetting('renderScale', 1);
    expect(matchPreset()).toBe('high');
    expect(settingsState.get('preset')).toBe('high');
  });

  it('持久化后可恢复（含自定义组合）', () => {
    applyPreset('medium');
    setSetting('fpsLimit', 0);
    persistSettings();
    const saved = JSON.parse(localStorage.getItem('eclipse_settings_v1')!);
    expect(saved.renderScale).toBe(0.75);
    expect(saved.fpsLimit).toBe(0);
    expect(saved.preset).toBe('custom');
    // 直接清空内存状态并重载（loadSettings 读回存储的自定义组合）
    settingsState.reset({ preset: 'ultra', ...PRESETS.ultra });
    loadSettings();
    const s = settingsState.state;
    expect(s.renderScale).toBe(0.75);
    expect(s.fpsLimit).toBe(0);
    expect(s.preset).toBe('custom');
  });

  it('脏数据加载时回退到合法值', () => {
    localStorage.setItem('eclipse_settings_v1', JSON.stringify({ renderScale: 1.7, fpsLimit: 999 }));
    loadSettings();
    const s = settingsState.state;
    expect(s.renderScale).toBe(1);
    expect(s.fpsLimit).toBe(60);
  });

  it('preset 名称与细项矛盾的脏数据被纠正为自定义', () => {
    localStorage.setItem('eclipse_settings_v1', JSON.stringify({
      preset: 'high', renderScale: 0.5, particleDensity: 1,
      glowFx: true, shake: true, dmgNumbers: true, bgDetail: true, fpsLimit: 60,
    }));
    loadSettings();
    const s = settingsState.state;
    expect(s.renderScale).toBe(0.5);
    expect(s.preset).toBe('custom');
  });

  it('四档预设互相独立且覆盖全部 7 项', () => {
    for (const id of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
      const p = PRESETS[id];
      expect(Object.keys(p).length).toBe(7);
      expect(typeof p.renderScale).toBe('number');
      expect(typeof p.particleDensity).toBe('number');
      expect(typeof p.glowFx).toBe('boolean');
      expect(typeof p.shake).toBe('boolean');
      expect(typeof p.dmgNumbers).toBe('boolean');
      expect(typeof p.bgDetail).toBe('boolean');
      expect(typeof p.fpsLimit).toBe('number');
    }
  });
});
