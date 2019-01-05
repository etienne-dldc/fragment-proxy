import { Proxyfier } from './Proxyfier';
import { notNill, repeat } from './utils';
import { Path } from './Path';
import { FragmentAny, Fragment, PATH, ROOT, FragmentState, FragmentStateData, INPUT } from './types';
import { DepsLayer, ROOT_INPUT } from './DepsLayer';
import isPlainObj = require('is-plain-obj');
import { PathTree } from './PathTree';

type InputSelect = Array<any>;

type ParentRef = any;

type Result = {};

type InputWithResult = { input: InputSelect; result: Result; observers: Set<ParentRef> };

type FragmentStateButBetter = Map<FragmentAny, Array<InputWithResult>>;

export class FramentsManager {
  private proxyfier = new Proxyfier();
  private fragmentsState: Map<FragmentAny, FragmentState> = new Map();
  private fragState: FragmentStateButBetter = new Map();

  private getFramentName(fragment: FragmentAny): string {
    return notNill(this.fragmentsState.get(fragment)).name;
  }

  private updateFragmentState(fragment: FragmentAny, name: string, data: FragmentStateData) {
    this.fragmentsState.set(fragment, {
      name,
      dirty: false,
      data,
    });
  }

  private getFragmentResult<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: (input: Input) => Output,
    input: any
  ): any {
    if (!this.fragState.has(fragment)) {
      this.fragState.set(fragment, []);
    }
    const parentLayer = this.proxyfier.getLastLayer();
    const parentRef = parentLayer ? parentLayer.ref : null;
    const state = notNill(this.fragState.get(fragment));

    // console.log('parentRef', parentRef);

    this.proxyfier.pushLayer(name, fragment);
    const proxyInput = this.proxyfier.proxify(input, ROOT_INPUT, undefined);
    const result = select(proxyInput);
    const usedLayer = this.proxyfier.popLayer();
    const unwraped = this.proxyfier.unwrap(result);
    const returnedLayer = DepsLayer.create(name, fragment);
    unwraped.paths.forEach(path => {
      DepsLayer.addPath(returnedLayer, path[ROOT], path[INPUT], path[PATH]);
    });
    const output = unwraped.value;
    console.log(PathTree.toPaths(usedLayer.input, d => d === true));

    this.updateFragmentState(fragment, name, {
      used: usedLayer,
      returned: returnedLayer,
      shape: unwraped.shape,
      value: unwraped.value,
      input,
    });
    return output;
  }

  private executeFragment<Input, Output>(
    fragment: FragmentAny,
    name: string,
    select: (input: Input) => Output,
    input: any
  ): any {
    const depth = repeat('>', this.proxyfier.getLayersCount());
    console.log(`[FRAG] ${depth} ${name} start`);
    const output = this.getFragmentResult(fragment, name, select, input);
    console.log(`[FRAG] ${depth} ${name} end`);
    return this.proxyfier.proxify(output, fragment, input);
  }

  // prettier-ignore
  fragment<Output, Input = void>(name: string, select: (input: Input) => Output): Fragment<Input, Output> {
    const fragment: FragmentAny = ((input: any) => {
      return this.executeFragment(fragment, name, select, input);
    }) as any;
    return fragment as any;
  }

  // prettier-ignore
  createResolve<Output>(name: string, fragment: () => Output): () => Output;
  // prettier-ignore
  createResolve<Input, Output>(name: string, fragment: (input: Input) => Output): (input: Input) => Output;

  createResolve(name: string, fragment: any): any {
    const ref = {};
    return (input: any) => {
      let result = {};
      if (fragment) {
        this.proxyfier.pushLayer('CONNECT', ref);
        result = fragment(input);
        this.proxyfier.popLayer();
      }
      result = this.proxyfier.unwrap(result).value;
      return result;
    };
  }

  logFragState() {
    const stringifyShape = (obj: any): any => {
      if (obj && obj[PATH] && obj[ROOT]) {
        const root = typeof obj[ROOT] === 'function' ? 'FRAG_' + this.getFramentName(obj[ROOT]) : String(obj[ROOT]);
        return Path.stringify([root, ...obj[PATH]]);
      }
      if (isPlainObj(obj)) {
        return Object.keys(obj).reduce<any>((acc, k) => {
          acc[k] = stringifyShape(obj[k]);
          return acc;
        }, {});
      }
      if (Array.isArray(obj)) {
        return obj.map(v => stringifyShape(v));
      }
      return obj;
    };
    console.log(
      Array.from(this.fragmentsState.values())
        .map(item => {
          return {
            ...item,
            data: item.data && {
              ...item.data,
              shapeRaw: item.data.shape,
              shape: stringifyShape(item.data.shape),
              returned: DepsLayer.toObject(item.data.returned, this.fragmentsState),
              used: DepsLayer.toObject(item.data.used, this.fragmentsState),
            },
          };
        })
        .reduce<any>((acc, i) => {
          acc[i.name] = i.data;
          return acc;
        }, {})
    );
  }
}
