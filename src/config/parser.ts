/* =========================================================
   蚀月远征 · 公式解析器
   支持两种模式：
   1. evalFormula() — 运行时解析求值（兼容旧 API）
   2. compileFormula() — 预编译为 (context) => number 闭包
   支持：+ - * / ( ) 以及函数 floor/max/min/abs/round/ceil
   变量从 context 对象中查找
   ========================================================= */

/* ========== Token 类型 ========== */
interface Token {
  type: string;
  raw: string;
  pos: number;
  value?: number;
  name?: string;
}

/* ========== AST 节点类型 ========== */
interface NumNode { t: 'num'; v: number }
interface VarNode { t: 'var'; name: string }
interface UnaryNode { t: 'unary'; op: '-'; child: ASTNode }
interface BinNode { t: 'bin'; op: string; l: ASTNode; r: ASTNode }
interface FuncNode { t: 'func'; name: string; args: ASTNode[] }

type ASTNode = NumNode | VarNode | UnaryNode | BinNode | FuncNode;

/* ========== 词法分析 ========== */
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

/* ========== 运行时求值（基于 AST 预编译） ========== */

/** 调用内置函数 */
function callFunction(name: string, args: number[]): number {
  switch (name) {
    case 'floor': return Math.floor(args[0]);
    case 'ceil': return Math.ceil(args[0]);
    case 'round': return Math.round(args[0]);
    case 'abs': return Math.abs(args[0]);
    case 'max': return Math.max(...args);
    case 'min': return Math.min(...args);
    case 'pow': return Math.pow(args[0], args[1]);
    default: throw new Error(`公式解析错误：未知函数 "${name}"`);
  }
}

/** 递归求值 AST 节点 */
function evalNode(node: ASTNode, context: Record<string, unknown>): number {
  switch (node.t) {
    case 'num': return node.v;
    case 'var': {
      const val = context[node.name];
      if (val === undefined) throw new Error(`公式解析错误：未知变量 "${node.name}"`);
      if (typeof val !== 'number') throw new Error(`公式解析错误：变量 "${node.name}" 不是数值 (${typeof val})`);
      return val;
    }
    case 'unary': return -evalNode(node.child, context);
    case 'bin': {
      const l = evalNode(node.l, context), r = evalNode(node.r, context);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        default: throw new Error(`未知二元运算符 "${node.op}"`);
      }
    }
    case 'func': {
      const args = node.args.map(a => evalNode(a, context));
      return callFunction(node.name, args);
    }
  }
}

/* ========== AST 解析 ========== */

type Parser = { ts: Token[]; pos: number };

function parseExpr(p: Parser): ASTNode {
  let left = parseTerm(p);
  while (p.pos < p.ts.length && (p.ts[p.pos].type === 'PLUS' || p.ts[p.pos].type === 'MINUS')) {
    const op = p.ts[p.pos++].raw;
    const right = parseTerm(p);
    left = { t: 'bin', op, l: left, r: right };
  }
  return left;
}

function parseTerm(p: Parser): ASTNode {
  let left = parseUnary(p);
  while (p.pos < p.ts.length && (p.ts[p.pos].type === 'MUL' || p.ts[p.pos].type === 'DIV')) {
    const op = p.ts[p.pos++].raw;
    const right = parseUnary(p);
    left = { t: 'bin', op, l: left, r: right };
  }
  return left;
}

function parseUnary(p: Parser): ASTNode {
  if (p.pos < p.ts.length && p.ts[p.pos].type === 'MINUS') {
    p.pos++;
    return { t: 'unary', op: '-', child: parseUnary(p) };
  }
  return parsePrimary(p);
}

function parsePrimary(p: Parser): ASTNode {
  if (p.pos >= p.ts.length) throw new Error('公式解析错误：意外的结尾');

  const t = p.ts[p.pos];

  // 数字
  if (t.type === 'NUMBER') {
    p.pos++;
    return { t: 'num', v: t.value! };
  }

  // 变量
  if (t.type === 'VAR') {
    p.pos++;
    return { t: 'var', name: t.name! };
  }

  // 函数调用
  if (t.type === 'FUNC') {
    p.pos++;
    if (p.pos >= p.ts.length || p.ts[p.pos].type !== 'LPAREN') throw new Error(`公式解析错误：函数 "${t.name}" 后需要 '('`);
    p.pos++; // 跳过 '('
    const args: ASTNode[] = [];
    if (p.pos < p.ts.length && p.ts[p.pos].type !== 'RPAREN') {
      args.push(parseExpr(p));
      while (p.pos < p.ts.length && p.ts[p.pos].type === 'COMMA') {
        p.pos++;
        args.push(parseExpr(p));
      }
    }
    if (p.pos >= p.ts.length || p.ts[p.pos].type !== 'RPAREN') throw new Error(`公式解析错误：函数 "${t.name}" 的参数列表需要 ')'`);
    p.pos++; // 跳过 ')'
    return { t: 'func', name: t.name!, args };
  }

  // 括号表达式
  if (t.type === 'LPAREN') {
    p.pos++;
    const val = parseExpr(p);
    if (p.pos >= p.ts.length || p.ts[p.pos].type !== 'RPAREN') throw new Error('公式解析错误：缺少 ")"');
    p.pos++;
    return val;
  }

  throw new Error(`公式解析错误：无法识别的 token "${t.raw}" 在位置 ${t.pos}`);
}

/** 从公式字符串解析为 AST */
function parseFormula(formula: string): ASTNode {
  const tokens = tokenize(formula);
  const p: Parser = { ts: tokens, pos: 0 };
  const result = parseExpr(p);
  if (p.pos < tokens.length) {
    throw new Error(`公式解析错误：意外 token "${tokens[p.pos].raw}" 在位置 ${tokens[p.pos].pos}`);
  }
  return result;
}

/* ========== 对外 API ========== */

/**
 * 运行时解析求值（兼容旧 API）
 * 每次调用都会重新解析，适合低频使用
 */
export function evalFormula(formula: string | number, context: Record<string, unknown>): number {
  if (typeof formula === 'number') return formula;
  const node = parseFormula(formula);
  return evalNode(node, context);
}

/**
 * 预编译公式：将公式字符串预编译为 (context) => number 闭包
 * 解析只发生一次，后续调用只做纯数值运算
 * 适合高频调用场景（如武器伤害计算）
 */
export function compileFormula(formula: string | number): (context: Record<string, unknown>) => number {
  if (typeof formula === 'number') return () => formula;
  const node = parseFormula(formula);
  return (context) => evalNode(node, context);
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