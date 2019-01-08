import { TrackingProxyfier } from './TrackingProxyfier';
import { FragmentAny, Fragment, FragmentCompute, InputRef, CacheItem, CacheTree, Cache, CacheData } from './types';
import { notNill, getOrSet } from './utils';
import { TrackingLayer } from './TrackingLayer';
import { STATE, INPUT } from './const';
import produce from 'immer';

export class FramentsManager<State> {
  private trackingProxyfier = new TrackingProxyfier();
  private proxyState: State;
  private rawState: State;
  private cache: Cache<CacheItem> = new Map();
  private cacheMapPath: Array<{ frag: FragmentAny; input: any }> = [];
  private nextCacheMap: CacheTree | null = null;

  constructor(state: State) {
    this.rawState = state;
    this.proxyState = this.trackingProxyfier.proxify(state, STATE, null);
  }

  private setCache(fragment: FragmentAny, input: InputRef, data: CacheData) {
    const fragCache = getOrSet(this.cache, fragment, new Map());
    if (!fragCache.has(input)) {
      fragCache.set(input, {
        data,
        resolvers: new Set(),
      });
    } else {
      throw new Error('Whaaat ?');
    }
  }

  private getCache(fragment: FragmentAny, input: InputRef): CacheData | null {
    const fragCache = getOrSet(this.cache, fragment, new Map());
    const cache = fragCache.get(input);
    return cache ? cache.data : null;
  }

  private computeFragment<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: FragmentCompute<State, Input, Output>,
    input: any,
    parentCacheMap: CacheTree
  ): any {
    this.trackingProxyfier.pushLayer(name, fragment, input);
    const proxyInput = this.trackingProxyfier.proxify(input, INPUT, null);

    const fragCacheMap = getOrSet(parentCacheMap.children, fragment, new Map());
    const currentCacheMap = {
      children: new Map(),
    };
    fragCacheMap.set(input, currentCacheMap);
    const result = select(this.proxyState, proxyInput);
    const usedLayer = this.trackingProxyfier.popLayer();
    const { value: output, shape, paths } = this.trackingProxyfier.unwrap(result);
    const returnedLayer = TrackingLayer.create(name, fragment, input);
    paths.forEach(path => {
      TrackingLayer.addPath(returnedLayer, path.type, path.input, path.path);
    });

    this.setCache(fragment, input, {
      result: output,
      returned: returnedLayer,
      used: usedLayer,
      shape: shape,
      cacheMap: currentCacheMap,
    });

    return output;
  }

  private getFragmentResult<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: FragmentCompute<State, Input, Output>,
    input: any
  ): any {
    const parentCacheMap = this.cacheMapPath.slice(0, -1).reduce((acc, val) => {
      return notNill(notNill(acc.children.get(val.frag)).get(val.input));
    }, notNill(this.nextCacheMap));
    const cache = this.getCache(fragment, input);
    if (cache) {
      const fragCacheMap = getOrSet(parentCacheMap.children, fragment, new Map());
      fragCacheMap.set(input, cache.cacheMap);
      return cache.result;
    }
    return this.computeFragment(fragment, name, select, input, parentCacheMap);
  }

  private executeFragment<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: FragmentCompute<State, Input, Output>,
    input: any
  ): any {
    this.cacheMapPath.push({ frag: fragment, input });
    const output = this.getFragmentResult(fragment, name, select, input);
    this.cacheMapPath.pop();
    return this.trackingProxyfier.proxify(output, fragment, input);
  }

  mutate(mutation: (state: State) => void) {
    const newState = produce(this.rawState, mutation, (mutations, inverseMutations) => {
      console.log({ mutations, inverseMutations });
    });
    console.log(newState, this.rawState);
  }

  // prettier-ignore
  fragment<Output, Input = void>(name: string, select: FragmentCompute<State, Input, Output>): Fragment<Input, Output> {
    const fragment: FragmentAny = ((input: any) => {
      return this.executeFragment(fragment, name, select, input);
    }) as any;
    fragment.displayName = name;
    return fragment as any;
  }

  // prettier-ignore
  createResolve<Output>(name: string, fragment: () => Output): () => Output;
  // prettier-ignore
  createResolve<Input, Output>(name: string, fragment: (input: Input) => Output): (input: Input) => Output;

  createResolve(name: string, fragment: any): any {
    const ref = Symbol(name);
    return (input: any) => {
      this.nextCacheMap = {
        children: new Map(),
      };
      this.cacheMapPath = [];
      const result = fragment(input);
      this.cache.forEach(v => {
        v.forEach(d => {
          d.resolvers.delete(ref);
        });
      });
      const traverse = (node: CacheTree) => {
        node.children.forEach((inputs, fragment) => {
          const frag = notNill(this.cache.get(fragment));
          inputs.forEach((d, input) => {
            const data = notNill(frag.get(input));
            data.resolvers.add(ref);
            traverse(d);
          });
        });
      };

      traverse(this.nextCacheMap);

      this.cache.forEach((v, fragment) => {
        v.forEach((d, input) => {
          if (d.resolvers.size === 0) {
            v.delete(input);
          }
        });
        if (v.size === 0) {
          this.cache.delete(fragment);
        }
      });

      return this.trackingProxyfier.unwrap(result).value;
    };
  }
}
