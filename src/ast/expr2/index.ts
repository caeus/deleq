import type * as Expr1 from '@/ast/expr1';
type ThunkRef = { type: 'scope' };

type Instruction =
  | {
      type: 'apply';
      arity: number;
    }
  | {
      type: 'assign';
      to: string;
    }
  | {
      type: 'ref';
      to: string;
    }
  | {
      type: 'rec';
      funs: Record<string, ThunkRef>;
    }
  | {
      type: 'return';
    }
  | {
      type: 'deleq';
      qty: number;
    };

type Thunk = {
  captures: string[];
  params: string[];
  instructions: Instruction[];
};

type Module = Thunk[];

type List<T> = {
  head: T;
  tail: List<T>;
} | null;

type CompileState = {
  thunks: List<Thunk>;
  count: number;
};

const instr: Instruction[] = [
  { type: 'ref', to: 'a' },
  { type: 'return' },
  {
    type: 'apply',
    arity: 1,
  },
];

function parseExpr(
  expr: Expr1.Expr,
  state: CompileState,
): [CompileState, number] {
  switch (expr.type) {
    case 'id':
    case 'fun':
    case 'block':
    case 'deleq':
    case 'apply':
  }
  throw '';
}
export { Module, instr };
