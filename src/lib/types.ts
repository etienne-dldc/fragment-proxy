import { INPUT, STATE } from './const';
import { TrackingLayer } from './TrackingLayer';

export type FragmentCompute<State, Input, Output> = (state: State, input: Input) => Output;

export type Fragment<Input, Output> = ([Input] extends [void] ? () => Output : (input: Input) => Output) & {
  displayName: string;
};

export type FragmentAny = Fragment<any, any>;

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MergeInOut<In, Out> = [In, Out] extends [object, object] ? Omit<In, keyof Out> & Out : Out;

export type InputRef = any;

export type ProxyType = (typeof INPUT) | (typeof STATE) | FragmentAny;

export type PathPart = string | number | symbol;

export type Path = Array<PathPart>;

export type Resolver = symbol;

export type CacheData = { result: any; shape: any; used: TrackingLayer; returned: TrackingLayer; cacheMap: CacheTree };

export type CacheItem = { data: CacheData; resolvers: Set<Resolver> };

export type Cache<Data> = Map<FragmentAny, Map<InputRef, Data>>;

export type CacheTree = {
  children: Cache<CacheTree>;
};
