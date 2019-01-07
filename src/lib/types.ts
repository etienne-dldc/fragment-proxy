export type FragmentCompute<State, Input, Output> = (ctx: { state: State; input: Input }) => Output;

export type Fragment<Input, Output> = ([Input] extends [void] ? () => Output : (input: Input) => Output) & {
  displayName: string;
};

export type FragmentAny = Fragment<any, any>;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MergeInOut<In, Out> = [In, Out] extends [object, object] ? Omit<In, keyof Out> & Out : Out;

export type InputRef = any;

export const IS_PROXY = Symbol('IS_PROXY');
export const PATH = Symbol('PATHS');
export const VALUE = Symbol('VALUE');
export const ROOT = Symbol('ROOT');
export const INPUT = Symbol('INPUT');
export const STATE = Symbol('STATE');

export type ProxyType = (typeof INPUT) | (typeof STATE) | FragmentAny;
