import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDevMode } from '../debug/dev_mode.js';

describe('dev mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('默认关闭（无 URL 参数 / localStorage / 环境变量）', () => {
    expect(isDevMode()).toBe(false);
  });

  it('URL 参数 ?dev=1 开启', () => {
    vi.stubGlobal('window', {
      location: { search: '?dev=1' },
    });
    vi.stubGlobal('localStorage', { getItem: () => null });
    expect(isDevMode()).toBe(true);
  });

  it('localStorage 标志开启', () => {
    vi.stubGlobal('window', { location: { search: '' } });
    vi.stubGlobal('localStorage', { getItem: () => '1' });
    expect(isDevMode()).toBe(true);
  });

  it('URL 参数优先于 localStorage 关闭', () => {
    vi.stubGlobal('window', { location: { search: '?dev=1' } });
    vi.stubGlobal('localStorage', { getItem: () => null });
    expect(isDevMode()).toBe(true);
  });
});
