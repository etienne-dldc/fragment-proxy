import { Proxyfier } from './Proxyfier';
import { notNill, repeat } from './utils';
import { PathTree } from './PathTree';
import { PathPart, Path } from './Path';
import { FragmentAny, Fragment, PATH, ROOT, FragmentState } from './types';
import { DepsLayer, ROOT_GLOBAL, ROOT_INPUT } from './DepsLayer';
import isPlainObj = require('is-plain-obj');

export class ConnectManager {
  private fragmentsState: Map<FragmentAny, FragmentState> = new Map();
  private proxyfier = new Proxyfier();
  // private dataReverseDeps: PathTree<{ yolo: boolean }> = PathTree.create<{ yolo: boolean }>();

  constructor() {}

  private createInitialFragmentState(name: string): FragmentState {
    return {
      dirty: true,
      name,
      used: null,
      returned: null,
      shape: null,
    };
  }

  private getFramentName(fragment: FragmentAny): string {
    return notNill(this.fragmentsState.get(fragment)).name;
  }

  private setFragementInfos(fragment: FragmentAny, used: DepsLayer, returned: DepsLayer, shape: any) {
    const node = notNill(this.fragmentsState.get(fragment));
    node.used = used;
    node.returned = returned;
    node.shape = shape;
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
      Array.from(this.fragmentsState.values()).map(info => {
        return {
          ...info,
          shape: stringifyShape(info.shape),
          returned: DepsLayer.toObject(info.returned, this.fragmentsState),
          used: DepsLayer.toObject(info.used, this.fragmentsState),
        };
      })
    );
  }

  track<T extends object | Array<any>>(name: PathPart, value: T): T {
    return this.proxyfier.proxify(value, [name], ROOT_GLOBAL);
  }

  // prettier-ignore
  fragment<Output, Input = void>(name: string, select: (input: Input) => Output): Fragment<Input, Output>;
  // prettier-ignore
  fragment<Selection, Output, Input = void>(name: string, select: (input: Input) => Selection, transform: (selection: Selection) => Output): Fragment<Input, Output>;
  // prettier-ignore
  fragment(name: string, select: (input: any) => any): FragmentAny {
    const fragmentId = name + Math.floor(Math.random() * 10000);

    const fragment: FragmentAny = ((input: any) => {
      this.proxyfier.pushLayer();
      const depth = repeat('>', this.proxyfier.getLayersCount());
      console.log(`[FRAG] ${depth} ${name} start`);
      const result = select(input);
      const layer = this.proxyfier.popLayer();
      const tracked = this.proxyfier.resolveTracked(result);
      const returnedLayer = DepsLayer.create();
      tracked.paths.forEach(path => {
        DepsLayer.addPath(returnedLayer, path[ROOT], path[PATH]);
      });
      const output = tracked.value;
      this.setFragementInfos(fragment, layer, returnedLayer, tracked.shape);
      console.log(`[FRAG] ${depth} ${name} end`);
      return this.proxyfier.proxify(output, [], fragment);
    }) as any;

    this.fragmentsState.set(fragment, this.createInitialFragmentState(name));

    return fragment as any;
  }

  // // prettier-ignore
  // connect<Props>(name: string, props: Props): Props;
  // // prettier-ignore
  // connect<Props, Output extends object>(name: string, props: Props, fragment: () => Output): MergeInOut<Props, Output>;
  // // prettier-ignore
  // connect<Props, Input, Output extends object>(name: string, props: Props, fragment: (input: Input) => Output, input: Input): MergeInOut<Props, Output>;

  // prettier-ignore
  connect<Output>(name: string, fragment: () => Output): Output;
  // prettier-ignore
  connect<Input, Output>(name: string, fragment: (input: Input) => Output, input: Input): Output;

  connect(name: string, fragment: any, input?: any): any {
    let result = {};
    if (fragment) {
      this.proxyfier.pushLayer();
      result = fragment(input);
      this.proxyfier.popLayer();
    }
    result = this.proxyfier.resolveTracked(result).value;
    return result;
  }
}
