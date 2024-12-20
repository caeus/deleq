type ValBinding = {
  type: 'val';
  id: string;
  to: Expr0;
};
type FunBinding = {
  type: 'fun';
  id: string;
  params: string[];
  body: Expr0;
};
type Binding = ValBinding | FunBinding;

type Expr0 =
  | { type: 'text'; value: string }
  | {
      type: 'ref';
      to: string;
    }
  | {
      type: 'fun';
      params: string[];
      body: Expr0;
    }
  | {
      type: 'block';
      bindings: Binding[];
      result: Expr0;
    }
  | {
      type: 'do';
      tag: string;
      args: Expr0[];
    }
  | {
      type: 'apply';
      fun: Expr0;
      args: Expr0[];
    };

export { Binding, Expr0, FunBinding, ValBinding };
