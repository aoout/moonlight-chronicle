/* =========================================================
   蚀月远征 · Schema 校验
   运行时数据文件校验，确保 JSON 数据格式正确
   在模块加载时自动执行，生产环境可用
   ========================================================= */

/** 字段校验规则 */
export interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 可选字段（默认必填） */
  optional?: boolean;
  /** 数组元素类型（type=array 时） */
  itemType?: 'string' | 'number' | 'boolean';
  /** 默认值（可选字段缺失时填充） */
  default?: any;
  /** 字段描述（仅用于日志） */
  desc?: string;
}

/** 记录校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 校验数据对象
 * @param data      数据对象（如 JSON.parse 的结果）
 * @param schema    字段名 → 规则
 * @param label     数据标签（用于日志区分）
 * @returns         校验结果
 */
export function validateSchema(
  data: Record<string, any>,
  schema: Record<string, FieldRule>,
  label: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, rule] of Object.entries(schema)) {
    const val = data[key];
    const isMissing = val === undefined || val === null;

    if (isMissing) {
      if (rule.optional && rule.default !== undefined) {
        data[key] = rule.default;
        continue;
      }
      if (!rule.optional) {
        errors.push(`[${label}] 缺少必填字段 "${key}"${rule.desc ? ` (${rule.desc})` : ''}`);
      }
      continue;
    }

    // 类型检查
    const actualType = Array.isArray(val) ? 'array' : typeof val;
    if (actualType !== rule.type) {
      // 数字可以接受字符串形式的数字（如 JSON 中的 "12"）
      if (rule.type === 'number' && actualType === 'string') {
        const parsed = Number(val);
        if (isNaN(parsed)) {
          errors.push(`[${label}] 字段 "${key}" 期望 number，实际为 "${val}" (string)`);
        } else {
          data[key] = parsed; // 自动转换
        }
      } else {
        errors.push(`[${label}] 字段 "${key}" 期望 ${rule.type}，实际为 ${actualType}`);
      }
      continue;
    }

    // 数组元素类型检查
    if (rule.type === 'array' && rule.itemType) {
      for (let i = 0; i < val.length; i++) {
        if (typeof val[i] !== rule.itemType) {
          warnings.push(`[${label}] 字段 "${key}[${i}]" 期望 ${rule.itemType}，实际为 ${typeof val[i]}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验记录集（如 weapons.json 中每个武器的 schema）
 * @param entries   记录映射 { key: value }
 * @param schema    每个记录的字段规则
 * @param label     数据标签
 */
export function validateEntries(
  entries: Record<string, any>,
  schema: Record<string, FieldRule>,
  label: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, entry] of Object.entries(entries)) {
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`[${label}] 条目 "${key}" 不是对象`);
      continue;
    }
    const result = validateSchema(entry, schema, `${label}.${key}`);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 校验并输出结果
 * 校验失败时在控制台输出警告，不会中断程序
 */
export function validateAndWarn(result: ValidationResult, label: string): void {
  if (result.valid && result.warnings.length === 0) return;
  if (result.warnings.length > 0) {
    console.warn(`[Schema] ${label} 校验警告 (${result.warnings.length}):`);
    for (const w of result.warnings) console.warn('  ⚠', w);
  }
  if (!result.valid) {
    console.warn(`[Schema] ${label} 校验失败 (${result.errors.length}):`);
    for (const e of result.errors) console.warn('  ✗', e);
  }
}