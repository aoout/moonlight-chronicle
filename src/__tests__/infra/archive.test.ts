/* =========================================================
   infra/persistence/archive · 拓印术（完整存档序列化）
   ---------------------------------------------------------
   验证：收集全部持久化域 → 拓印成 JSON 残卷 → 唤醒回写；
   以及对损坏 / 异源 / 异版本残卷的拒绝。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportFullSave, parseArchive, importFullSave, localExportedAt,
  DOMAIN_KEYS, ARCHIVE_APP,
} from '../../infra/persistence/archive.js';
import { installHostGlobals, clearHostStorage } from '../_harness/host.js';

beforeEach(() => {
  installHostGlobals();
  clearHostStorage();
});

describe('exportFullSave', () => {
  it('将全部持久化域收集进残卷', () => {
    localStorage.setItem('eclipse_cycle_save', JSON.stringify({ unlocked: 3 }));
    localStorage.setItem('eclipse_run_save_v1', JSON.stringify({ stage: 5, gold: 99 }));
    localStorage.setItem('eclipse_achievements_save', JSON.stringify({ counts: {}, earned: { a_kill_100: true }, best: {} }));

    const archive = exportFullSave(1234567890);
    const parsed = JSON.parse(archive);
    expect(parsed.app).toBe(ARCHIVE_APP);
    expect(parsed.v).toBe(1);
    expect(parsed.exportedAt).toBe(1234567890);
    expect(parsed.domains['eclipse_cycle_save']).toBe('{"unlocked":3}');
    expect(parsed.domains['eclipse_run_save_v1']).toBe('{"stage":5,"gold":99}');
    expect(parsed.domains['eclipse_achievements_save']).toBe(JSON.stringify({ counts: {}, earned: { a_kill_100: true }, best: {} }));
  });

  it('不存在的域不写入残卷', () => {
    const archive = JSON.parse(exportFullSave());
    for (const key of DOMAIN_KEYS) {
      expect(key in archive.domains).toBe(false);
    }
  });
});

describe('parseArchive', () => {
  it('接受合法的蚀月拓印', () => {
    const archive = exportFullSave();
    const res = parseArchive(archive);
    expect(res.ok).toBe(true);
    expect(res.archive?.v).toBe(1);
  });

  it('拒绝非蚀月来源的 JSON', () => {
    const res = parseArchive(JSON.stringify({ app: 'other-game', v: 1, domains: {} }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe('此页并非蚀月拓印');
  });

  it('拒绝不同版本的拓印', () => {
    const res = parseArchive(JSON.stringify({ app: ARCHIVE_APP, v: 99, domains: {} }));
    expect(res.ok).toBe(false);
    expect(res.error).toContain('不同年代');
  });

  it('拒绝损坏的 JSON', () => {
    const res = parseArchive('not-json{{{');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('拓印字迹已毁，无法辨认');
  });

  it('拒绝缺少 domains 的结构', () => {
    const res = parseArchive(JSON.stringify({ app: ARCHIVE_APP, v: 1 }));
    expect(res.ok).toBe(false);
  });
});

describe('importFullSave', () => {
  it('将残卷中的域写回 localStorage', () => {
    localStorage.setItem('eclipse_cycle_save', '{"unlocked":1}');
    const archive = exportFullSave();
    localStorage.clear();
    const res = importFullSave(archive);
    expect(res.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(1);
  });

  it('残卷中缺失的域保持本地现状', () => {
    const archive = JSON.stringify({ app: ARCHIVE_APP, v: 1, exportedAt: 1, domains: { eclipse_cycle_save: '{"unlocked":7}' } });
    localStorage.setItem('eclipse_run_save_v1', '{"stage":2}');
    const res = importFullSave(archive);
    expect(res.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('eclipse_cycle_save')!).unlocked).toBe(7);
    expect(JSON.parse(localStorage.getItem('eclipse_run_save_v1')!).stage).toBe(2);
  });

  it('拒绝并回滚（不写任何域）', () => {
    const before = exportFullSave(111);
    const res = importFullSave('garbage');
    expect(res.ok).toBe(false);
    expect(exportFullSave(111)).toBe(before);
  });
});

describe('localExportedAt', () => {
  it('无存档时返回 0', () => {
    expect(localExportedAt()).toBe(0);
  });

  it('取各域中最大的 exportedAt', () => {
    localStorage.setItem('eclipse_cycle_save', JSON.stringify({ exportedAt: 100 }));
    localStorage.setItem('eclipse_run_save_v1', JSON.stringify({ exportedAt: 300 }));
    expect(localExportedAt()).toBe(300);
  });

  it('无法解析的域不参与比较', () => {
    localStorage.setItem('eclipse_cycle_save', 'not-json');
    localStorage.setItem('eclipse_run_save_v1', JSON.stringify({ exportedAt: 42 }));
    expect(localExportedAt()).toBe(42);
  });
});
