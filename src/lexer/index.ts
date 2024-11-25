import { Lexer, Rule, TokenOf } from 'gramr-ts';

// skip needs documentation, it's chaining

const keyword = Lexer.keyword;

const braces = <Suffix extends string>(
  suffix: Suffix,
  open: string,
  close: string,
) =>
  [keyword(`open_${suffix}`, open), keyword(`close_${suffix}`, close)] as const;

const fun = keyword('fun');
const semicolon = keyword('semicolon', ';');
const val = keyword('val');
const comma = keyword('comma', ',');
const deleq = keyword('deleq');
const parens = braces('paren', '(', ')');
const curlys = braces('curly', '{', '}');
const eq = keyword('eq', '=');

const id = Rule.chain<string>()
  .skip(Rule.nextIf<string>((char) => /[a-zA-Z_]/u.test(char)))
  .skip(Rule.nextIf<string>((char) => /\w/u.test(char)).let(Rule.loop()))
  .done.let(Lexer.slice)
  .let(Rule.map((id) => ({ type: 'id' as const, id }) as const));
const whitespace = Lexer.whitespace.let(Rule.loop());
const lexer = Lexer.create(
  [val, fun, eq, semicolon, deleq, comma, ...parens, ...curlys, id],
  whitespace,
);
type Token = TokenOf<typeof lexer>;
export { lexer, Token };
///
