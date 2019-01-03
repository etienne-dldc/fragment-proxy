import { DepsLayer } from './DepsLayer';

export type Fragment<Input, Output> = [Input] extends [void] ? () => Output : (input: Input) => Output;

export type FragmentAny = Fragment<any, any>;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MergeInOut<In, Out> = [In, Out] extends [object, object] ? Omit<In, keyof Out> & Out : Out;

export const IS_PROXY = Symbol('IS_PROXY');
export const PATH = Symbol('PATHS');
export const VALUE = Symbol('VALUE');
export const ROOT = Symbol('ROOT');

export type FragmentState = {
  dirty: boolean;
  name: string;
  used: DepsLayer | null;
  returned: DepsLayer | null;
  shape: any;
};
