import { Proxyfier } from './Proxyfier';
import { PathTreeManager, PathPart } from './PathYolo';
import { notNill } from './utils';

type FragmentDeps = {
  frag: Set<FragmentAny>;
  used: PathTreeManager;
  returned: PathTreeManager;
};

type FragmentState = {
  dirty: boolean;
  name: string;
  deps: FragmentDeps;
};

type Fragment<Input, Output> = [Input] extends [void] ? () => Output : (input: Input) => Output;

type FragmentAny = Fragment<any, any>;

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

type MergeInOut<In, Out> = [In, Out] extends [object, object] ? Omit<In, keyof Out> & Out : Out;

export class ConnectManager {
  private fragmentsState: WeakMap<FragmentAny, FragmentState> = new WeakMap();
  private proxyfier = new Proxyfier();
  private currentDepTracker: Set<FragmentAny> | null = null;
  private dataReverseDeps: 

  constructor() {}

  private createInitialFragmentState(name: string): FragmentState {
    return {
      dirty: true,
      name,
      deps: {
        frag: new Set(),
        used: new PathTreeManager(),
        returned: new PathTreeManager(),
      },
    };
  }

  private setFragementDeps(fragment: FragmentAny, deps: FragmentDeps) {
    notNill(this.fragmentsState.get(fragment)).deps = deps;
  }

  logFragState(all: Array<FragmentAny>) {
    console.log(all.map(frag => notNill(this.fragmentsState.get(frag))));
  }

  track<T extends object | Array<any>>(name: PathPart, value: T): T {
    return this.proxyfier.proxify(value, [name]);
  }

  // prettier-ignore
  fragment<Output, Input = void>(name: string, select: (input: Input) => Output): Fragment<Input, Output>;
  // prettier-ignore
  fragment<Selection, Output, Input = void>(name: string, select: (input: Input) => Selection, transform: (selection: Selection) => Output): Fragment<Input, Output>;
  // prettier-ignore
  fragment(name: string, select: (input: any) => any): Fragment<any, any> {
    const fragmentId = name + Math.floor(Math.random() * 10000);

    const fragment: Fragment<any, any> = ((input: any) => {
      if (this.currentDepTracker) {
        this.currentDepTracker.add(fragment);
      }
      const previousDepTracker = this.currentDepTracker;
      this.currentDepTracker = new Set();
      const usedPathManager = new PathTreeManager();
      this.proxyfier.pushPathManager(usedPathManager);
      // const proxyState = proxify(this.state, usedPathManager);
      console.log(`[FRAG] ${name} start`);
      const result = select(input);
      this.proxyfier.popPathManager();
      const tracked = this.proxyfier.resolveTracked(result);
      const returnedPathManager = new PathTreeManager();
      tracked.paths.forEach(path => {
        returnedPathManager.add(path);
      });
      const output = tracked.value;
      const deps: FragmentDeps = {
        frag: this.currentDepTracker,
        used: usedPathManager,
        returned: returnedPathManager,
      }
      this.setFragementDeps(fragment, deps)
      // console.log(usedPathManager.toPaths());

      console.log(`[FRAG] ${name} end`);
      this.currentDepTracker = previousDepTracker;
      return output;
    }) as any;

    this.fragmentsState.set(fragment, this.createInitialFragmentState(name));

    return fragment as any;
  }

  // prettier-ignore
  connect<Props>(name: string, props: Props): Props;
  // prettier-ignore
  connect<Props, Output extends object>(name: string, props: Props, fragment: () => Output): MergeInOut<Props, Output>;
  // prettier-ignore
  connect<Props, Input, Output extends object>(name: string, props: Props, fragment: (input: Input) => Output, input: Input): MergeInOut<Props, Output>;

  connect(name: string, props: any, fragment?: any, input?: any): any {
    // console.log(`[CONNECT] ${name} start`);
    let result = {};
    if (fragment) {
      result = fragment(input);
    }
    // console.log(`[CONNECT] ${name} end`);
    return { ...props, ...result };
  }
}
