import { Bind, Lexer, Recursive } from 'gramr-ts';
import { parse_expr0 } from './ast/expr1';
import { Module, parse_expr1 } from './ast/expr2';
import { execute_op } from './execute';
import { Frame } from './execute/frame';
import { Scope } from './execute/scope';
import { Stack } from './execute/stack';
import { Value } from './execute/value';
import { lexer } from './lexer';
import { parser } from './parser';
class Unfinished extends Bind {
  readonly finished: false = false as const;
  constructor(
    readonly module: Module,
    readonly frame: Frame,
    readonly tag: string,
    readonly args: readonly Value[],
  ) {
    super();
  }
}
class Finished extends Bind {
  readonly finished: true = true as const;
  constructor(readonly value: Value) {
    super();
  }
}
const compile = (code: string): Module => {
  const tokens_result0 = lexer.let(Lexer.feed(code));
  if (!tokens_result0.accepted)
    throw new Error('Error tokenizing', { cause: tokens_result0.rejections });
  const ast0_result = parser.run(tokens_result0.result)(0);
  if (!ast0_result.accepted)
    throw new Error(
      'Error stage 0 parsing' + JSON.stringify(tokens_result0.result),
      { cause: ast0_result.rejections },
    );
  const ast1 = parse_expr0(ast0_result.result);
  return parse_expr1(ast1, 0).thunks;
};
type Generator = Unfinished | Finished;
const err = (): never => {
  throw new Error();
};
const run =
  (...args: Exclude<Value, { type: 'fun' }>[]) =>
  (module: Module): Generator => {
    const thunk = module[0] ?? err();
    const fiber = Recursive.run(
      execute_op(
        module,
        Frame.of({
          thunk_id: 0,
          op_id: 0,
          scope: Scope.root.let(Scope.extend(thunk.params, args)),
          stack: Stack.empty,
          cont: null,
        }),
      ),
    );
    if (fiber.done) {
      return new Finished(fiber.value);
    } else {
      return new Unfinished(module, fiber.frame, fiber.tag, fiber.args);
    }
  };
const resume =
  (value: Value) =>
  (unfinished: Unfinished): Generator => {
    const fiber = Recursive.run(
      execute_op(
        unfinished.module,
        unfinished.frame.let(Frame.push_and_next(value)),
      ),
    );
    if (fiber.done) {
      return new Finished(fiber.value);
    } else {
      return new Unfinished(
        unfinished.module,
        fiber.frame,
        fiber.tag,
        fiber.args,
      );
    }
  };
export { compile, Generator, resume, run };
