import { Proxyfier } from './Proxyfier';
import { FragmentAny, Fragment, INPUT, ROOT, PATH, STATE, FragmentCompute, InputRef } from './types';
import { Path } from './Path';
import { notNill, arrayShallowEqual, repeat, getOrSet } from './utils';
import { DepsLayer } from './DepsLayer';
import { PathTree } from './PathTree';

type Resolver = symbol;

type CacheItem = { result: any; shape: any; used: DepsLayer; returned: DepsLayer };

type ResolverCache = Map<FragmentAny, Map<InputRef, CacheItem>>;

type CachePath = Array<number>;

export class FramentsManager<State> {
  private proxyfier = new Proxyfier();
  private resolver: Resolver | null = null;
  private state: State;
  private cache: Map<Resolver, ResolverCache> = new Map();
  private currentCachePath: CachePath | null = null;
  private siblingsCount: number = 0;
  private nextCache: ResolverCache | null = null;

  constructor(state: State) {
    this.state = this.proxyfier.proxify(state, STATE, null);
  }

  private selectPath(input: any, path: Path): any {
    const rawInput = this.proxyfier.unproxify(input);
    // ignore first because it's always 'ROOT'
    return path.slice(1).reduce((acc, part) => acc[part], rawInput);
  }

  private selectPaths(input: any, paths: Array<Path>): Array<any> {
    return paths.map(path => this.selectPath(input, path));
  }

  private setCache(fragment: FragmentAny, input: InputRef, data: CacheItem) {
    const resolverCache = notNill(this.nextCache);
    const fragCache = getOrSet(resolverCache, fragment, new Map());
    if (!fragCache.has(input)) {
      fragCache.set(input, data);
    }
  }

  private getPreviousCache(fragment: FragmentAny, input: InputRef): CacheItem | null {
    const resolverCache = getOrSet(this.cache, notNill(this.resolver), new Map());
    const fragCache = getOrSet(resolverCache, fragment, new Map());
    return fragCache.get(input) || null;
  }

  private getCurrentCache(fragment: FragmentAny, input: InputRef): CacheItem | null {
    const resolverCache = notNill(this.nextCache);
    const fragCache = getOrSet(resolverCache, fragment, new Map());
    return fragCache.get(input) || null;
  }

  private getCache(fragment: FragmentAny, input: InputRef): CacheItem | null {
    const current = this.getCurrentCache(fragment, input);
    if (current) {
      return current;
    }
    return this.getPreviousCache(fragment, input);
  }

  private getFragmentResult<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: FragmentCompute<State, Input, Output>,
    input: any
  ): any {
    const cache = this.getCache(fragment, input);
    if (cache) {
      console.log('cache hit in ' + fragment.displayName);
      return cache.result;
    }
    const siblingsCount = this.siblingsCount;
    if (this.currentCachePath === null) {
      this.currentCachePath = [];
    } else {
      notNill(this.currentCachePath).push(siblingsCount);
    }
    this.siblingsCount = 0;

    this.proxyfier.pushLayer(name, fragment, input);
    const path = [
      notNill(this.resolver),
      ...this.proxyfier.getLayerPath().map(o => ({ input: o.input, frargment: o.fragment.displayName })),
    ];
    const proxyInput = this.proxyfier.proxify(input, INPUT, null);

    const depth = repeat('>', this.proxyfier.getLayersCount());
    console.log(`[FRAG] ${depth} ${name} start ${JSON.stringify(input)}`);

    const result = select({ state: this.state, input: proxyInput });

    console.log(`[FRAG] ${depth} ${name} end`);

    const usedLayer = this.proxyfier.popLayer();
    const usedPaths = PathTree.toPaths(usedLayer.trees.input, d => !!d);
    const { value: output, shape, paths } = this.proxyfier.unwrap(result);
    const returnedLayer = DepsLayer.create(name, fragment, input);
    paths.forEach(path => {
      DepsLayer.addPath(returnedLayer, path[ROOT], path[INPUT], path[PATH]);
    });

    this.setCache(fragment, input, {
      result: output,
      returned: returnedLayer,
      used: usedLayer,
      shape: shape,
    });

    if (notNill(this.currentCachePath).length > 0) {
      notNill(this.currentCachePath).pop();
    }
    this.siblingsCount = siblingsCount + 1;

    return output;
  }

  private executeFragment<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: FragmentCompute<State, Input, Output>,
    input: any
  ): any {
    const output = this.getFragmentResult(fragment, name, select, input);
    return this.proxyfier.proxify(output, fragment, input);
  }

  setState(state: State): void {
    this.state = this.proxyfier.proxify(state, STATE, null);
  }

  // prettier-ignore
  fragment<Input, Output>(name: string, select: FragmentCompute<State, Input, Output>): Fragment<Input, Output> {
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
      let result = {};
      if (fragment) {
        this.currentCachePath = null;
        this.siblingsCount = 0;
        this.resolver = ref;
        this.nextCache = new Map();
        result = fragment(input);
        this.cache.set(ref, this.nextCache);
        this.nextCache = null;
        this.resolver = null;
        this.currentCachePath = null;
      }
      result = this.proxyfier.unwrap(result).value;
      return result;
    };
  }
}
