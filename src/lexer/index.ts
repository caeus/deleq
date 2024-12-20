import { Lexer, Rule, TokenOf } from 'gramr-ts';

// skip needs documentation, it's chaining

const keyword = Lexer.keyword;

const braces = <Suffix extends string>(
  suffix: Suffix,
  open: string,
  close: string,
) =>
  [keyword(`open_${suffix}`, open), keyword(`close_${suffix}`, close)] as const;

const fun_kw = keyword('fun');
const semicolon_kw = keyword('semicolon', ';');
const val_kw = keyword('val');
const comma_kw = keyword('comma', ',');
const do_kw = keyword('do');
const parens_kws = braces('paren', '(', ')');
const curlys_kws = braces('curly', '{', '}');
const eq_kw = keyword('eq', '=');
const text_token = Rule.chain<string>()
  .skip(Lexer.exact("'"))
  .skip(Rule.fork(Lexer.noneOf("'"), Lexer.exact("''")).let(Rule.loop()))
  .skip(Lexer.exact("'"))
  .done.let(Lexer.slice)
  .let(Rule.map((x) => x.replaceAll("''", "'").slice(1, -1)))
  .let(Rule.map((value) => ({ type: 'text' as const, value })));
const id = Rule.chain<string>()
  .skip(Rule.nextIf<string>((char) => /[a-zA-Z_]/u.test(char)))
  .skip(Rule.nextIf<string>((char) => /\w/u.test(char)).let(Rule.loop()))
  .done.let(Lexer.slice)
  .let(Rule.map((id) => ({ type: 'id' as const, id }) as const));
const whitespace = Lexer.whitespace.let(Rule.loop());
const lexer = Lexer.create(
  [
    val_kw,
    fun_kw,
    eq_kw,
    text_token,
    semicolon_kw,
    do_kw,
    comma_kw,
    ...parens_kws,
    ...curlys_kws,
    id,
  ],
  whitespace,
);
type Token = TokenOf<typeof lexer>;
export { lexer, Token };
///
