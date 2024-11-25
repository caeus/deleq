import type * as Expr0 from '@/ast/expr0';
import { Rule } from 'gramr-ts';
type ValBinding = {
  type: 'val';
  id: string;
  to: Expr;
};
type FunBinding = {
  id: string;
  params: readonly string[];
  body: Expr;
};
type RecBinding = {
  type: 'rec';
  funs: readonly [FunBinding, ...FunBinding[]];
};

type Binding = ValBinding | RecBinding;

type Expr = Readonly<
  | { type: 'id'; id: string }
  | {
      type: 'fun';
      params: string[];
      body: Expr;
    }
  | {
      type: 'block';
      bindings: Binding[];
      result: Expr;
    }
  | {
      type: 'deleq';
      args: Expr[];
    }
  | {
      type: 'apply';
      fun: Expr;
      args: Expr[];
    }
>;
type Expr0BindingType = Expr0.Binding['type'];
type Expr0BindingCase<Type extends Expr0BindingType> = Extract<
  Expr0.Binding,
  { type: Type }
>;
const bindingCaseRule = <Type extends Expr0BindingType>(
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
function parseFunBinding(binding: Expr0.FunBinding): FunBinding {
  return { id: binding.id, params: binding.params, body: parse(binding.body) };
}
function parseValBinding(binding: Expr0.ValBinding): ValBinding {
  return { type: 'val', id: binding.id, to: parse(binding.to) };
}

const parseBindingsRaw: Rule<Expr0.Binding, Binding[]> = Rule.fork(
  bindingCaseRule('val').let(Rule.map(parseValBinding)),
  Rule.chain<Expr0.Binding>()
    .push(bindingCaseRule('fun'))
    .push(Rule.collect<Expr0.Binding>()(bindingCaseRule('fun')))
    .done.let(
      Rule.map(
        ([binding, bindings]) =>
          ({
            type: 'rec',
            funs: [
              parseFunBinding(binding),
              ...bindings.map(parseFunBinding),
            ] as const,
          }) satisfies RecBinding as RecBinding,
      ),
    ),
).let(Rule.collect());

const parseBindings = (bindings: readonly Expr0.Binding[]): Binding[] => {
  const result = parseBindingsRaw.run(bindings)(0);
  if (result.val.accepted) return result.val.result;
  throw '';
};

const parse = (expr: Expr0.Expr): Expr => {
  switch (expr.type) {
    case 'id':
      return expr;
    case 'fun':
      return {
        type: 'fun',
        params: expr.params,
        body: parse(expr.body),
      };
    case 'block':
      return {
        type: 'block',
        bindings: parseBindings(expr.bindings),
        result: parse(expr.result),
      };
    case 'deleq':
      return {
        type: 'deleq',
        args: expr.args.map(parse),
      };
    case 'apply':
      return {
        type: 'apply',
        fun: parse(expr.fun),
        args: expr.args.map(parse),
      };
  }
};
export { Expr, parse };

