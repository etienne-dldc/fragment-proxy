import { proxify, Path, createTracked, resolveTracked, Tracked } from './proxify';

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

type Select<I, O, P> = (input: Trackable<I>, props: P) => O;

type Trackable<Value> = {
  value: Value;
  track: Value;
};

function createTrackable<V>(value: V, basePath: string | null, paths: Array<Path>): Trackable<V> {
  const initPath = basePath ? [basePath] : [];
  return {
    value,
    track: proxify(value, initPath, paths),
  };
}

export function createTrackFactory<State extends object>(state: State) {
  const proxyState = proxify(state);

  /*
    var range = num => Array(num).fill(null).map((v, i) => i + 1);
    var types = range(5).map(i => [
      `  // prettier-ignore\n`,
      `  function track<${range(i).map(j => `O${j}`).join(', ')}, Props = void>`,
      `(name: string, ${range(i).map(j => `select${j}: Select<${j === 1 ? 'State' : `O${j-1}`}, O${j}, Props>`).join(', ')}): `,
      `FragmentOutput<Props, O${i}>;`
    ].join('')).join('\n');
    copy(types);
    console.log(types);
  */

  // prettier-ignore
  function track<O1, Props = void>(name: string, select1: Select<State, O1, Props>): FragmentOutput<Props, O1>;
  // prettier-ignore
  function track<O1, O2, Props = void>(name: string, select1: Select<State, O1, Props>, select2: Select<O1, O2, Props>): FragmentOutput<Props, O2>;
  // prettier-ignore
  function track<O1, O2, O3, Props = void>(name: string, select1: Select<State, O1, Props>, select2: Select<O1, O2, Props>, select3: Select<O2, O3, Props>): FragmentOutput<Props, O3>;
  // prettier-ignore
  function track<O1, O2, O3, O4, Props = void>(name: string, select1: Select<State, O1, Props>, select2: Select<O1, O2, Props>, select3: Select<O2, O3, Props>, select4: Select<O3, O4, Props>): FragmentOutput<Props, O4>;
  // prettier-ignore
  function track<O1, O2, O3, O4, O5, Props = void>(name: string, select1: Select<State, O1, Props>, select2: Select<O1, O2, Props>, select3: Select<O2, O3, Props>, select4: Select<O3, O4, Props>, select5: Select<O4, O5, Props>): FragmentOutput<Props, O5>;

  function track<Output, Props = void>(name: string, ...selects: Array<(prev: any, props: Props) => any>): Output {
    return ((input: any) => {
      console.log(`[FRAG] ${name} start`);
      const result = selects.reduce<null | Tracked>((acc, select, index) => {
        if (index === 0) {
          return resolveTracked(select(createTrackable(proxyState, null, []), input));
        }
        const res = resolveTracked(select(createTrackable(acc.value, String(index), acc.paths), input));
        return res;
      }, null);
      console.log(`[FRAG] ${name} result`, result);
      const output = result.value;
      console.log(`[FRAG] ${name} end`);
      return createTracked(output, result.paths);
    }) as any;
  }

  return track;
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
