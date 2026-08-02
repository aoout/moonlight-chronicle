/* =========================================================
   蚀月远征 · 公式解析器
   将公式字符串解析为 AST 并求值
   支持：+ - * / ( ) 以及函数 floor/max/min/abs/round
   变量从 context 对象中查找
   ========================================================= */

interface Token {
  type: string;
  raw: string;
  pos: number;
  value?: number;
  name?: string;
}

/** 公式解析器 */
export function evalFormula(formula: string | number, context: Record<string, number>): number {
  if (typeof formula === 'number') return formula;
  const tokens = tokenize(formula);
  let pos = 0;
  const result = parseExpression(tokens);
  if (pos < tokens.length) throw new Error(`公式解析错误：意外 token "${tokens[pos].raw}" 在位置 ${tokens[pos].pos}`);
  return result;

  /** 解析表达式：term (('+' | '-') term)* */
  function parseExpression(ts: Token[]): number {
    let left = parseTerm(ts);
    while (pos < ts.length && (ts[pos].type === 'PLUS' || ts[pos].type === 'MINUS')) {
      const op = ts[pos++].type;
      const right = parseTerm(ts);
      left = op === 'PLUS' ? left + right : left - right;
    }
    return left;
  }

  /** 解析项：factor (('*' | '/') factor)* */
  function parseTerm(ts: Token[]): number {
    let left = parseUnary(ts);
    while (pos < ts.length && (ts[pos].type === 'MUL' || ts[pos].type === 'DIV')) {
      const op = ts[pos++].type;
      const right = parseUnary(ts);
      left = op === 'MUL' ? left * right : left / right;
    }
    return left;
  }

  /** 解析一元运算符：'-' factor | factor */
  function parseUnary(ts: Token[]): number {
    if (pos < ts.length && ts[pos].type === 'MINUS') {
      pos++;
      return -parseUnary(ts);
    }
    return parsePrimary(ts);
  }

  /** 解析基本表达式：数字 | 变量 | '(' expr ')' | 函数调用 */
  function parsePrimary(ts: Token[]): number {
    if (pos >= ts.length) throw new Error('公式解析错误：意外的结尾');

    const t = ts[pos];

    // 数字
    if (t.type === 'NUMBER') {
      pos++;
      return t.value!;
    }

    // 变量
    if (t.type === 'VAR') {
      pos++;
      const val = context[t.name!];
      if (val === undefined) throw new Error(`公式解析错误：未知变量 "${t.name}"`);
      if (typeof val !== 'number') throw new Error(`公式解析错误：变量 "${t.name}" 不是数值 (${typeof val})`);
      return val;
    }

    // 函数调用：函数名(参数, ...)
    if (t.type === 'FUNC') {
      pos++;
      if (pos >= ts.length || ts[pos].type !== 'LPAREN') throw new Error(`公式解析错误：函数 "${t.name}" 后需要 '('`);
      pos++; // 跳过 '('
      const args: number[] = [];
      if (pos < ts.length && ts[pos].type !== 'RPAREN') {
        args.push(parseExpression(ts));
        while (pos < ts.length && ts[pos].type === 'COMMA') {
          pos++;
          args.push(parseExpression(ts));
        }
      }
      if (pos >= ts.length || ts[pos].type !== 'RPAREN') throw new Error(`公式解析错误：函数 "${t.name}" 的参数列表需要 ')'`);
      pos++; // 跳过 ')'
      return callFunction(t.name!, args);
    }

    // 括号表达式
    if (t.type === 'LPAREN') {
      pos++;
      const val = parseExpression(ts);
      if (pos >= ts.length || ts[pos].type !== 'RPAREN') throw new Error('公式解析错误：缺少 ")"');
      pos++;
      return val;
    }

    throw new Error(`公式解析错误：无法识别的 token "${t.raw}" 在位置 ${t.pos}`);
  }
}

/** 调用内置函数 */
function callFunction(name: string, args: number[]): number {
  switch (name) {
    case 'floor': return Math.floor(args[0]);
    case 'ceil': return Math.ceil(args[0]);
    case 'round': return Math.round(args[0]);
    case 'abs': return Math.abs(args[0]);
    case 'max': return Math.max(...args);
    case 'min': return Math.min(...args);
    default: throw new Error(`公式解析错误：未知函数 "${name}"`);
  }
}

/** 将公式字符串词法分析为 token 数组 */
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = formula.trim();

  while (i < s.length) {
    const ch = s[i];

    // 跳过空白
    if (/\s/.test(ch)) { i++; continue; }

    // 运算符
    if (ch === '+') { tokens.push({ type: 'PLUS', raw: ch, pos: i }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'MINUS', raw: ch, pos: i }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'MUL', raw: ch, pos: i }); i++; continue; }
    if (ch === '/') { tokens.push({ type: 'DIV', raw: ch, pos: i }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'LPAREN', raw: ch, pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', raw: ch, pos: i }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', raw: ch, pos: i }); i++; continue; }

    // 数字（整数或浮点数）
    if (/[0-9]/.test(ch)) {
      let num = '';
      const start = i;
      while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i]; i++; }
      tokens.push({ type: 'NUMBER', raw: num, pos: start, value: parseFloat(num) });
      continue;
    }

    // 标识符（变量名或函数名）
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      const start = i;
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { ident += s[i]; i++; }
      // 判断是否为函数调用：标识符后紧跟 '('
      const isFunc = i < s.length && s[i] === '(';
      tokens.push({
        type: isFunc ? 'FUNC' : 'VAR',
        raw: ident,
        pos: start,
        name: ident,
      });
      continue;
    }

    throw new Error(`公式解析错误：无法识别的字符 "${ch}" 在位置 ${i}`);
  }

  return tokens;
}

/** 从公式字符串中提取用到的变量名列表 */
export function extractVars(formula: string): string[] {
  if (typeof formula !== 'string') return [];
  const vars = new Set<string>();
  const tokens = tokenize(formula);
  for (const t of tokens) {
    if (t.type === 'VAR' && t.name) vars.add(t.name);
  }
  return Array.from(vars);
}
