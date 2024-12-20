import type * as Expr0 from '@/ast/expr0';
import { Rule } from 'gramr-ts';
type ValBinding = {
  type: 'val';
  id: string;
  to: Expr1;
};
type FunBinding = {
  id: string;
  params: readonly string[];
  body: Expr1;
  captures: Set<string>;
};
type RecBinding = {
  type: 'rec';
  funs: readonly [FunBinding, ...FunBinding[]];
};

type Binding = ValBinding | RecBinding;
const SetOps = {
  difference<A>(set: Set<A>, setB: Set<A>): Set<A> {
    return new Set([...set].filter((element) => !setB.has(element)));
  },
  union<A>(...sets: Set<A>[]): Set<A> {
    const result = new Set<A>();
    for (const set of sets) {
      for (const entry of set) {
        result.add(entry);
      }
    }
    return result;
  },
  push<A>(target: Set<A>, from: Set<A>): void {
    for (const i of from) {
      target.add(i);
    }
  },
};

type Expr1 = Readonly<
  (
    | { type: 'text'; value: string }
    | {
        type: 'ref';
        to: string;
      }
    | {
        type: 'fun';
        params: string[];
        body: Expr1;
      }
    | {
        type: 'block';
        bindings: Binding[];
        result: Expr1;
      }
    | {
        type: 'do';
        tag: string;
        args: Expr1[];
      }
    | {
        type: 'apply';
        fun: Expr1;
        args: Expr1[];
      }
  ) & { captures: Set<string> }
>;
type Expr0BindingType = Expr0.Binding['type'];
type Expr0BindingCase<Type extends Expr0BindingType> = Extract<
  Expr0.Binding,
  { type: Type }
>;
const binding_case_rule = <Type extends Expr0BindingType>(
  type: Type,
): Rule<Expr0.Binding, Expr0BindingCase<Type>> =>
  Rule.nextAs((binding: Expr0.Binding) => {
    if (binding.type == type) {
      return {
        accepted: true,
        value: binding as Expr0BindingCase<Type>,
      };
    } else {
      return { accepted: false, msg: `Ignored` };
    }
  });
function parse_fun_binding(binding: Expr0.FunBinding): FunBinding {
  const body = parse_expr0(binding.body);
  return {
    id: binding.id,
    params: binding.params,
    body,
    captures: SetOps.difference(body.captures, new Set([...binding.params])),
  };
}
function parse_val_binding(binding: Expr0.ValBinding): ValBinding {
  const to = parse_expr0(binding.to);
  return {
    type: 'val',
    id: binding.id,
    to,
  };
}

const parse_bindings_raw: Rule<Expr0.Binding, Binding[]> = Rule.fork(
  binding_case_rule('val').let(Rule.map(parse_val_binding)),
  Rule.chain<Expr0.Binding>()
    .push(binding_case_rule('fun'))
    .push(Rule.collect<Expr0.Binding>()(binding_case_rule('fun')))
    .done.let(
      Rule.map(([binding, bindings]) => {
        const head = parse_fun_binding(binding);
        const tail = bindings.map(parse_fun_binding);
        return {
          type: 'rec',
          funs: [head, ...tail] as const,
        } satisfies RecBinding as RecBinding;
      }),
    ),
).let(Rule.collect());

function parse_block(
  bindings0: readonly Expr0.Binding[],
  result0: Expr0.Expr0,
): Expr1 {
  const bindings1 = parse_bindings_raw.run(bindings0)(0);
  if (!bindings1.accepted) throw bindings1.rejections;
  const captures = new Set<string>();
  const assigned = new Set<string>();
  for (const binding of bindings1.result) {
    switch (binding.type) {
      case 'val':
        // Captures everything in the expression of this assignment, except what was assigned before
        SetOps.push(captures, SetOps.difference(binding.to.captures, assigned));
        // Now add to assigned the current binding
        assigned.add(binding.id);
        break;
      case 'rec':
        SetOps.push<string>(
          captures,
          SetOps.difference(
            SetOps.union<string>(...binding.funs.map((f) => f.captures)),
            assigned,
          ),
        );
        SetOps.push(assigned, new Set([...binding.funs.map((f) => f.id)]));
        break;
    }
  }
  const result = parse_expr0(result0);
  SetOps.push(captures, SetOps.difference(result.captures, assigned));
  return {
    type: 'block',
    bindings: bindings1.result,
    result,
    captures,
  };
}

const parse_expr0 = (expr: Expr0.Expr0): Expr1 => {
  switch (expr.type) {
    case 'ref':
      return { ...expr, captures: new Set(expr.to) };
    case 'fun': {
      const body = parse_expr0(expr.body);
      return {
        type: 'fun',
        params: expr.params,
        body,
        captures: SetOps.difference(body.captures, new Set(expr.params)),
      };
    }
    case 'block':
      return parse_block(expr.bindings, expr.result);

    case 'do': {
      const args = expr.args.map(parse_expr0);
      return {
        type: 'do',
        tag: expr.tag,
        args,
        captures: SetOps.union(...args.map((a) => a.captures)),
      };
    }
    case 'apply': {
      const fun = parse_expr0(expr.fun);
      const args = expr.args.map(parse_expr0);
      return {
        type: 'apply',
        fun: fun,
        args: args,
        captures: SetOps.union(fun.captures, ...args.map((a) => a.captures)),
      };
    }
    case 'text': {
      return { ...expr, captures: new Set() } satisfies Expr1 as Expr1;
    }
  }
};
export { Binding, Expr1, FunBinding, parse_expr0, ValBinding };
