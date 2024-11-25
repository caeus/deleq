type ValBinding = {
  type: 'val';
  id: string;
  to: Expr;
};
type FunBinding = {
  type: 'fun';
  id: string;
  params: string[];
  body: Expr;
};
type Binding = ValBinding | FunBinding;

type Expr =
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
    };

export { Binding, FunBinding, ValBinding, Expr };
