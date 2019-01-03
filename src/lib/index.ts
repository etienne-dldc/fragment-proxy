import { proxify, Path, resolveTracked } from './proxify';

type FragmentOutput<Input, Output> = [Input] extends [void] ? () => Output : (input: Input) => Output;

function stringifyPath(path: Path): string {
  return path.map(v => String(v)).join('.');
}

export function createFragmentFactory<State extends object>(state: State) {
  function fragment<Output, Input = void>(
    name: string,
    select: (state: State, input: Input) => Output
  ): FragmentOutput<Input, Output>;
  function fragment<Selection, Output, Input = void>(
    name: string,
    select: (state: State, input: Input) => Selection,
    transform: (selection: Selection) => Output
  ): FragmentOutput<Input, Output>;

  function fragment<Selection, Output, Input = void>(
    name: string,
    select: (state: State, input: Input) => Selection
  ): FragmentOutput<Input, Output> {
    return ((input: any) => {
      let currentFragment: Array<Path> = [];
      const proxyState = proxify(state, path => {
        currentFragment.push(path);
      });
      console.log(`[FRAG] ${name} start`);
      const result = select(proxyState, input);
      const tracked = resolveTracked(result);
      const output = tracked.value;
      console.log({ tracked: tracked.paths, currentFragment });

      console.log(`[FRAG] ${name} end`);
      return output;
    }) as any;
  }

  return fragment;
}

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MergeInOut<In, Out> = [In, Out] extends [object, object] ? Omit<In, keyof Out> & Out : Out;

// prettier-ignore
export function connect<Props>(name: string, props: Props): Props;
// prettier-ignore
export function connect<Props, Output extends object>(name: string, props: Props, fragment: () => Output): MergeInOut<Props, Output>;
// prettier-ignore
export function connect<Props, Input, Output extends object>(name: string, props: Props, fragment: (input: Input) => Output, input: Input): MergeInOut<Props, Output>;

export function connect(name: string, props: any, fragment?: any, input?: any): any {
  console.log(`[CONNECT] ${name} start`);
  let result = {};
  if (fragment) {
    const tracked = resolveTracked(fragment(input));
    tracked.paths.forEach(path => {
      console.log(`[CONNECT] ${name} track ${stringifyPath(path)}`);
    });
    result = tracked.value;
  }
  console.log(`[CONNECT] ${name} end`);
  return { ...props, ...result };
}
