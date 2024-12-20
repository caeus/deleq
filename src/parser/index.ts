import { Binding, Expr0, FunBinding, ValBinding } from '@/ast/expr0';
import { Token } from '@/lexer';
import { Parser, Rule } from 'gramr-ts';

type TRule<R> = Rule<Token, R>;
type TokenType = Token['type'];
type TokenCase<Type extends TokenType> = Extract<Token, { type: Type }>;
// This shit cannot be inlined
type BraceSuffixes<T> = T extends `close_${infer S}`
  ? S
  : T extends `open_${infer S}`
    ? S
    : never;
type TokenBrace = BraceSuffixes<TokenType>;

const chain = Rule.chain<Token>;
const token = <Type extends TokenType>(
  type: Type,
): Rule<Token, TokenCase<Type>> =>
  Rule.nextAs((token: Token) => {
    if (token.type == type) {
      return {
        accepted: true,
        value: token as TokenCase<Type>,
      };
    } else
      return { accepted: false, msg: `Expected ${type}, got ${token.type}` };
  })
    .let(Rule.path(type))
    .let(Rule.log);

const expr: TRule<Expr0> = Rule.lazy(() => postfix_expr);

const id = token('id');
const ref_expr: TRule<Expr0> = id.let(
  Rule.map(
    (t) =>
      ({
        type: 'ref',
        to: t.id,
      }) satisfies Expr0 as Expr0,
  ),
);
const fun = token('fun');
const do$ = token('do');
const val = token('val');
const comma = token('comma');
const semicolon = token('semicolon');
const eq = token('eq');
const text = token('text');
const text_expr: TRule<Expr0> = text.let(
  Rule.map((token) => token satisfies Expr0),
);
const delimiters = <Brace extends TokenBrace>(brace: Brace) =>
  [token(`open_${brace}`), token(`close_${brace}`)] as const;
const parens = delimiters('paren');
const curlys = delimiters('curly');
const fun_params: TRule<string[]> = id
  .let(Rule.collect({ sep: comma }))
  .let(Rule.map((ps) => ps.map((p) => p.id)))
  .let(Parser.enclose(...parens));

const fun_args: TRule<Expr0[]> = expr
  .let(Rule.collect({ sep: comma }))
  .let(Parser.enclose(...parens));

const fun_expr: TRule<Expr0> = chain()
  //
  .skip(fun)
  .push(fun_params)
  .skip(eq)
  .push(expr)
  .done.let(
    Rule.map(([params, body]) => {
      return {
        type: 'fun',
        params,
        body,
      } satisfies Expr0 as Expr0;
    }),
  )
  .let(Rule.path('fun'))
  .let(Rule.log);
const val_binding = chain()
  //
  .skip(val)
  .push(id)
  .skip(eq)
  .push(expr)
  .done.let(
    Rule.map(
      ([id, to]) =>
        ({
          type: 'val',
          id: id.id,
          to,
        }) satisfies ValBinding as ValBinding,
    ),
  )
  .let(Rule.log);
const fun_binding = chain()
  //
  .skip(fun)
  .push(id)
  .push(fun_params)
  .skip(eq)
  .push(expr)
  .done.let(
    Rule.map(
      ([id, params, body]) =>
        ({
          type: 'fun',
          id: id.id,
          params,
          body,
        }) satisfies FunBinding as FunBinding,
    ),
  )
  .let(Rule.path('fun_binding'))
  .let(Rule.log);
const binding: TRule<Binding> = Rule.fork(val_binding, fun_binding);
const block_expr: TRule<Expr0> = Parser.enclose(...curlys)(
  chain()
    .push(
      chain()
        .push(
          binding.let(
            Rule.collect({
              min: 1,
              sep: semicolon,
            }),
          ),
        )
        .skip(semicolon)
        .done.let(Rule.first)
        .let(Rule.optional),
    )
    .push(expr)
    .done.let(
      Rule.map(
        ([bindings, result]) =>
          ({
            type: 'block',
            bindings: bindings || [],
            result,
          }) satisfies Expr0 as Expr0,
      ),
    )
    .let(Rule.path('block'))
    .let(Rule.log),
);
const grouped_expr = Parser.enclose(...parens)(expr)
  .let(Rule.path('postfix'))
  .let(Rule.log);
const do_expr: TRule<Expr0> = chain()
  .skip(do$)
  .push(text)
  .push(fun_args)
  .done.let(
    Rule.map(
      ([tag, args]) =>
        ({ type: 'do', tag: tag.value, args }) satisfies Expr0 as Expr0,
    ),
  )
  .let(Rule.log);
const atomic_expr: TRule<Expr0> = Rule.fork(
  ref_expr,
  fun_expr,
  grouped_expr,
  block_expr,
  do_expr,
  text_expr,
);
type PostfixSuffix = (expr: Expr0) => Expr0;
const apply_suffix = fun_args.let(
  Rule.map(
    (args) =>
      (fun: Expr0): Expr0 =>
        ({
          type: 'apply',
          fun,
          args,
        }) satisfies Expr0 as Expr0,
  ),
);
const postfix_suffix: TRule<PostfixSuffix> = apply_suffix.let(Rule.unfinished);
const postfix_suffixes: TRule<PostfixSuffix> = postfix_suffix
  .let(Rule.collect())
  .let(
    Rule.map((suffixes) => (expr: Expr0) => {
      let result = expr;
      for (const suffix of suffixes) {
        result = suffix(expr);
      }
      return result;
    }),
  )
  .let(Rule.log);
const postfix_expr: TRule<Expr0> = chain()
  .push(atomic_expr)
  .push(postfix_suffixes)
  .done.let(Rule.map(([expr, suffix]) => suffix(expr)))
  .let(Rule.unfinished)
  .let(Rule.path('postfix'))
  .let(Rule.log);
const parser = chain()
  .push(expr)
  .skip(Rule.end)
  .done.let(Rule.first)
  .let(Rule.log);
export { parser };
