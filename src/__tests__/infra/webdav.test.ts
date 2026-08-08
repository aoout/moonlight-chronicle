/* =========================================================
   infra/persistence/webdav · 星海驿站（WebDAV 同步）
   ---------------------------------------------------------
   通过 mock fetch 验证：寄月（PUT）/ 收月（GET）/ 潮汐（自动同步）
   的请求路径、鉴权头、状态机与冲突判定。
   ========================================================= */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveWebdavConfig, loadWebdavConfig, clearWebdavConfig,
  probeWebdav, pushToWebdav, pullFromWebdav, syncTide, SYNC_FILE,
} from '../../infra/persistence/webdav.js';
import { installHostGlobals, clearHostStorage } from '../_harness/host.js';
import { exportFullSave } from '../../infra/persistence/archive.js';

/** 与 webdav.ts 内部一致的指纹（基于稳定内容 v+domains，剥离时间戳） */
function fingerprintOfCurrentLocal(): string {
  const json = exportFullSave();
  const obj = JSON.parse(json);
  const stable = JSON.stringify({ v: obj.v, domains: obj.domains });
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const CFG = { url: 'https://dav.example.com/eclipse/', username: 'moon', password: 'waxing' };

interface MockFetchCall {
  url: string;
  init: RequestInit;
}

let calls: MockFetchCall[] = [];
let respondWith: (url: string, init: RequestInit) => Promise<Response>;

function mockFetch(fn: (url: string, init: RequestInit) => Promise<Response>): void {
  respondWith = fn;
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return respondWith(url, init);
  }));
}

function okRes(body?: string): Response {
  return new Response(body ?? '', { status: 200 });
}

beforeEach(() => {
  installHostGlobals();
  clearHostStorage();
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('配置读写', () => {
  it('保存后可读回，地址去除首尾空白', () => {
    saveWebdavConfig({ url: '  https://dav.example.com/x/  ', username: 'moon', password: 'p' });
    expect(loadWebdavConfig()).toEqual({ url: 'https://dav.example.com/x/', username: 'moon', password: 'p' });
  });

  it('存储层不落明文密语（混淆化落盘）', () => {
    saveWebdavConfig({ url: 'https://dav.example.com/', username: 'moon', password: 'waxing-secret' });
    const raw = localStorage.getItem('eclipse_sync_config_v1')!;
    expect(raw).not.toContain('waxing-secret');
    expect(raw).toContain('obf1:');
    // 读回仍是明文，供鉴权头使用
    expect(loadWebdavConfig()!.password).toBe('waxing-secret');
  });

  it('中文与特殊字符密语往返无损', () => {
    saveWebdavConfig({ url: 'https://dav.example.com/', username: 'moon', password: '蚀月·密语!@#$%^&*()_+=' });
    expect(loadWebdavConfig()!.password).toBe('蚀月·密语!@#$%^&*()_+=');
    const raw = localStorage.getItem('eclipse_sync_config_v1')!;
    expect(raw).not.toContain('蚀月');
  });

  it('旧版明文配置向后兼容（无 obf1: 前缀直接读回）', () => {
    localStorage.setItem('eclipse_sync_config_v1', JSON.stringify({ url: 'https://old.example.com/', username: 'moon', password: 'legacy-plain' }));
    expect(loadWebdavConfig()).toEqual({ url: 'https://old.example.com/', username: 'moon', password: 'legacy-plain' });
  });

  it('无配置时返回 null，清除后返回 null', () => {
    expect(loadWebdavConfig()).toBeNull();
    saveWebdavConfig(CFG);
    expect(loadWebdavConfig()).not.toBeNull();
    clearWebdavConfig();
    expect(loadWebdavConfig()).toBeNull();
  });

  it('损坏的配置返回 null', () => {
    localStorage.setItem('eclipse_sync_config_v1', 'not-json');
    expect(loadWebdavConfig()).toBeNull();
  });
});

describe('probeWebdav', () => {
  it('OPTIONS 返回 2xx 视为可达', async () => {
    mockFetch(async (url, init) => {
      expect(init.method).toBe('OPTIONS');
      expect(url).toBe('https://dav.example.com/eclipse/');
      return okRes();
    });
    await expect(probeWebdav(CFG)).resolves.toBe(true);
  });

  it('服务器拒绝（401）仍视为可达', async () => {
    mockFetch(async () => new Response('', { status: 401 }));
    await expect(probeWebdav(CFG)).resolves.toBe(true);
  });

  it('网络中断返回 false', async () => {
    mockFetch(async () => { throw new TypeError('network down'); });
    await expect(probeWebdav(CFG)).resolves.toBe(false);
  });

  it('请求携带 Basic 鉴权头', async () => {
    mockFetch(async (_url, init) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      expect(auth).toBe('Basic ' + btoa('moon:waxing'));
      return okRes();
    });
    await probeWebdav(CFG);
  });
});

describe('pushToWebdav（寄月）', () => {
  it('PUT 完整残卷到驿站文件，成功后记录元数据', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":5}');
    mockFetch(async (url, init) => {
      if (init.method === 'MKCOL') return new Response('', { status: 201 });
      expect(init.method).toBe('PUT');
      expect(url).toContain(SYNC_FILE);
      const body = JSON.parse(String(init.body));
      expect(body.app).toBe('moonlight-chronicle');
      expect(body.domains['eclipse_cycle_save']).toBe('{"unlocked":5}');
      return okRes();
    });
    const res = await pushToWebdav(CFG);
    expect(res.status).toBe('ok');
    const meta = JSON.parse(localStorage.getItem('eclipse_sync_meta_v1')!);
    expect(meta.lastFingerprint).toBeTruthy();
    expect(meta.lastRemoteAt).toBeGreaterThan(0);
  });

  it('驿站拒收（4xx/5xx）返回 error', async () => {
    mockFetch(async () => new Response('', { status: 502 }));
    const res = await pushToWebdav(CFG);
    expect(res.status).toBe('error');
  });

  it('网络中断返回 error', async () => {
    mockFetch(async () => { throw new TypeError('down'); });
    const res = await pushToWebdav(CFG);
    expect(res.status).toBe('error');
    expect(res.message).toContain('寄月失败');
  });
});

describe('pullFromWebdav（收月）', () => {
  it('拉取残卷并写回本地', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":1}');
    const remote = JSON.stringify({
      app: 'moonlight-chronicle', v: 1, exportedAt: 5000,
      domains: { eclipse_cycle_save: '{"unlocked":8}' },
    });
    mockFetch(async () => okRes(remote));
    const res = await pullFromWebdav(CFG);
    expect(res.status).toBe('ok');
    expect(res.applied).toBe(true);
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(8);
  });

  it('驿站无卷（404）返回 no-remote 且不改本地', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":2}');
    mockFetch(async () => new Response('', { status: 404 }));
    const res = await pullFromWebdav(CFG);
    expect(res.status).toBe('no-remote');
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(2);
  });

  it('远端残卷损坏则拒绝且不写回', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":3}');
    mockFetch(async () => okRes('garbage'));
    const res = await pullFromWebdav(CFG);
    expect(res.status).toBe('error');
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(3);
  });
});

describe('syncTide（潮汐）', () => {
  it('驿站无卷时自动寄月', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":4}');
    let putSeen = false;
    mockFetch(async (url, init) => {
      if (init.method === 'MKCOL') return new Response('', { status: 201 });
      if (init.method === 'PUT') { putSeen = true; return okRes(); }
      return new Response('', { status: 404 });
    });
    const res = await syncTide(CFG);
    expect(putSeen).toBe(true);
    expect(res.status).toBe('ok');
  });

  it('远端更晚且本地未动 → 收月', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":1}');
    // 模拟上次同步基线：指纹与当前本地一致，远端时间旧
    const nowFp = fingerprintOfCurrentLocal();
    localStorage.setItem('eclipse_sync_meta_v1', JSON.stringify({ lastRemoteAt: 100, lastFingerprint: nowFp }));
    const remote = JSON.stringify({
      app: 'moonlight-chronicle', v: 1, exportedAt: 9999,
      domains: { eclipse_cycle_save: '{"unlocked":9}' },
    });
    mockFetch(async () => okRes(remote));
    const res = await syncTide(CFG);
    expect(res.status).toBe('ok');
    expect(res.applied).toBe(true);
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(9);
  });

  it('本地改动且远端未更新 → 寄月', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":6}');
    // 先模拟上次同步：元数据里 lastRemoteAt = 1000，本地指纹与现在不同
    localStorage.setItem('eclipse_sync_meta_v1', JSON.stringify({ lastRemoteAt: 1000, lastFingerprint: 'stale-fp' }));
    const remote = JSON.stringify({
      app: 'moonlight-chronicle', v: 1, exportedAt: 1000,
      domains: { eclipse_cycle_save: '{"unlocked":6}' },
    });
    let putSeen = false;
    mockFetch(async (url, init) => {
      if (init.method === 'MKCOL') return new Response('', { status: 201 });
      if (init.method === 'PUT') { putSeen = true; return okRes(); }
      return okRes(remote);
    });
    const res = await syncTide(CFG);
    expect(putSeen).toBe(true);
    expect(res.status).toBe('ok');
  });

  it('双方各有新月光 → 冲突', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":6}');
    localStorage.setItem('eclipse_sync_meta_v1', JSON.stringify({ lastRemoteAt: 1000, lastFingerprint: 'stale-fp' }));
    const remote = JSON.stringify({
      app: 'moonlight-chronicle', v: 1, exportedAt: 9000,
      domains: { eclipse_cycle_save: '{"unlocked":7}' },
    });
    mockFetch(async () => okRes(remote));
    const res = await syncTide(CFG);
    expect(res.status).toBe('conflict');
  });

  it('两轮月光一致 → 无操作', async () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":6}');
    // 模拟上次同步基线：指纹与当前本地一致，远端时间也一致
    localStorage.setItem('eclipse_sync_meta_v1', JSON.stringify({ lastRemoteAt: 5000, lastFingerprint: fingerprintOfCurrentLocal() }));
    const remote = JSON.stringify({
      app: 'moonlight-chronicle', v: 1, exportedAt: 5000,
      domains: { eclipse_cycle_save: '{"unlocked":6}' },
    });
    let putSeen = false;
    mockFetch(async (url, init) => {
      if (init.method === 'PUT') { putSeen = true; return okRes(); }
      return okRes(remote);
    });
    const res = await syncTide(CFG);
    expect(putSeen).toBe(false);
    expect(res.status).toBe('ok');
    expect(res.message).toContain('无需往返');
  });
});
