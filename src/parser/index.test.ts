import { lexer, Token } from '@/lexer';
import { Lexer } from 'gramr-ts';
import { test } from 'vitest';
import { parser } from '.';

test('happy path', () => {
  const result0 = lexer.let(
    Lexer.feed(`fun(arg)={
    val a = do'a'(arg);
    val b = do'b'(a);
    fun c(d) = do'c'(b);
    c(a)(b)
}
    `),
  );
  if (!result0.accepted) {
    throw new Error('Failed to lex!', { cause: result0.rejections });
  }
  const tokens: Token[] = result0.result;
  const result1 = parser.run(tokens)(0);
  if (!result1.accepted)
    throw new Error('Failed to parse (stage0)!', { cause: result1.rejections });

  console.log(result1);
});
