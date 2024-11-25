import { lexer, Token } from '@/lexer';
import { Lexer } from 'gramr-ts';
import { test } from 'vitest';
import { parser } from '.';

test('happy path', () => {
  const result0 = lexer.let(
    Lexer.feed(`fun(arg)={
    val a = deleq(arg);
    val b = deleq(a);
    fun c(d) = deleq(b);
    c(a)(b)
}`),
  );
  if (!result0.val.accepted) {
    throw new Error('Failed to lex!', { cause: result0.val.errors });
  }
  const tokens: Token[] = result0.val.result;
  const result1 = parser.run(tokens)(0);
  console.log(result1);
});
