import type * as Expr1 from '@/ast/expr1';
type RecBinding = Readonly<{ thunk_addr: number; to: string }>;
type Op = Readonly<
  | { type: 'text'; value: string }
  | {
      type: 'apply';
      arity: number;
    }
  | {
      type: 'let';
      to: string;
    }
  | {
      type: 'rec';
      to: readonly RecBinding[];
    }
  | {
      type: 'ref';
      to: string;
    }
  | {
      type: 'return';
    }
  | {
      type: 'do';
      tag: string;
      qty: number;
    }
  | {
      type: 'thunk';
      addr: number;
    }
>;

type Emit = {
  ops: Op[];
  thunks: Thunk[];
};

type Thunk = Readonly<{
  captures: readonly string[];
  params: readonly string[];
  ops: readonly Op[];
}>;

type Module = Thunk[];

function as_block(
  result: Expr1.Expr1,
): Extract<Expr1.Expr1, { type: 'block' }> {
  switch (result.type) {
    case 'block':
      return result;
    default:
      return {
        type: 'block',
        bindings: [],
        result,
        captures: result.captures,
      };
  }
}
function parse_binding(binding: Expr1.Binding, offset: number): Emit {
  switch (binding.type) {
    case 'val': {
      const emit = parse_expr1(binding.to, offset);
      return {
        ops: [...emit.ops, { type: 'let', to: binding.id }],
        thunks: emit.thunks,
      };
    }
    case 'rec': {
      return parse_fun_bindings(binding.funs, offset);
    }
  }
}
function block_ops(
  bindings: Expr1.Binding[],
  result: Expr1.Expr1,
  offset: number,
): Emit {
  let new_offset: number = offset;
  let thunks: Thunk[] = [];
  let ops: Op[] = [];
  for (const binding of bindings) {
    const { ops: ops_, thunks: thunks_ } = parse_binding(binding, new_offset);
    new_offset = new_offset + thunks_.length;
    ops = [...ops, ...ops_];
    thunks = [...thunks, ...thunks_];
  }
  const { ops: rops, thunks: thunks_ } = parse_expr1(result, new_offset);
  return { ops: [...ops, ...rops], thunks: [...thunks, ...thunks_] };
}
function parse_fun_bindings(
  bindings: readonly [Expr1.FunBinding, ...Expr1.FunBinding[]],
  offset: number,
): Emit {
  const thunks: Thunk[] = [];
  const rec_refs: Extract<Op, { type: 'rec' }>['to'][number][] = [];
  let new_offset = offset;
  for (const binding of bindings) {
    const emit = parse_expr1(binding.body, new_offset + 1);
    rec_refs.push({ thunk_addr: new_offset, to: binding.id });
    new_offset = new_offset + emit.thunks.length;
    thunks.push({
      captures: [...binding.captures],
      params: binding.params,
      ops: [...emit.ops, { type: 'return' }],
    });
  }
  return { ops: [{ type: 'rec', to: rec_refs }], thunks };
}
function parse_args(
  exprs: [Expr1.Expr1, ...Expr1.Expr1[]],
  offset: number,
): Emit {
  let new_offset = offset;
  let ops: [Op, ...Op[]] = [] as unknown as [Op, ...Op[]];
  let thunks: Thunk[] = [];
  for (const expr of exprs) {
    const emit = parse_expr1(expr, new_offset);
    new_offset = new_offset + emit.thunks.length;
    ops = [...ops, ...emit.ops];
    thunks = [...thunks, ...emit.thunks];
  }
  return { ops, thunks };
}

function parse_expr1(expr: Expr1.Expr1, offset: number): Emit {
  switch (expr.type) {
    case 'ref':
      return { ops: [{ type: 'ref', to: expr.to }], thunks: [] };
    case 'fun': {
      const block = as_block(expr.body);
      const { ops: bodyops, thunks } = block_ops(
        block.bindings,
        block.result,
        offset + 1,
      );
      return {
        ops: [{ type: 'thunk', addr: offset }],
        thunks: [
          {
            captures: [...expr.captures],
            params: expr.params,
            ops: [...bodyops, { type: 'return' }],
          },
          ...thunks,
        ],
      }; // TODO
    }
    case 'block': {
      const { ops: bodyops, thunks } = block_ops(
        expr.bindings,
        expr.result,
        offset + 1,
      );
      return {
        ops: [
          { type: 'apply', arity: 0 },
          { type: 'thunk', addr: offset },
        ],
        thunks: [
          {
            captures: [...expr.captures],
            params: [],
            ops: [...bodyops, { type: 'return' }],
          } satisfies Thunk as Thunk,
          ...thunks,
        ],
      };
    }

    case 'do': {
      if (expr.args.length == 0) {
        return { ops: [{ type: 'do', tag: expr.tag, qty: 0 }], thunks: [] };
      }
      const emit = parse_args(expr.args as never, offset); // I'm lazy, I know it's not empty, so `never` works

      return {
        ops: [
          ...emit.ops,
          { type: 'do', tag: expr.tag, qty: expr.args.length },
        ],
        thunks: emit.thunks,
      };
    }

    case 'apply': {
      const emit = parse_args([expr.fun, ...expr.args], offset);
      return {
        ops: [...emit.ops, { type: 'apply', arity: expr.args.length }],
        thunks: emit.thunks,
      };
    }
    case 'text': {
      return { ops: [{ type: 'text', value: expr.value }], thunks: [] };
    }
  }
}
const to_module = (emit: Emit): Module => {
  return emit.thunks;
};
export { Module, Op, Thunk, parse_expr1, to_module };
