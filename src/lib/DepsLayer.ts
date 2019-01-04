import { FragmentAny, ROOT, PATH, FragmentState } from './types';
import { Path } from './Path';
import { PathTree } from './PathTree';
import { notNill } from './utils';

export const ROOT_MAIN = Symbol('ROOT_MAIN');
export const ROOT_INPUT = Symbol('ROOT_INPUT');

export type Root = (typeof ROOT_MAIN) | (typeof ROOT_INPUT) | FragmentAny;

export type DepsLayer = {
  main: PathTree<boolean>;
  input: PathTree<boolean>;
  frag: Map<FragmentAny, PathTree<boolean>>;
};

function create(): DepsLayer {
  return {
    main: PathTree.create(false),
    input: PathTree.create(false),
    frag: new Map(),
  };
}

function getPathTree(layer: DepsLayer, root: Root): PathTree<boolean> {
  if (root === ROOT_MAIN) {
    return layer.main;
  }
  if (root === ROOT_INPUT) {
    return layer.input;
  }
  if (!layer.frag.has(root)) {
    layer.frag.set(root, PathTree.create(false));
  }
  return notNill(layer.frag.get(root));
}

function addPath(layer: DepsLayer, root: Root, path: Path) {
  PathTree.addPath(getPathTree(layer, root), path, true);
}

function toObject(layer: DepsLayer | null, fragmentsState: Map<FragmentAny, FragmentState>): object | null {
  if (layer === null) {
    return null;
  }
  return {
    main: PathTree.toPaths(layer.main, d => !!d).map(path => Path.stringify(path)),
    input: PathTree.toPaths(layer.input, d => !!d).map(path => Path.stringify(path)),
    frag: Array.from(layer.frag.entries()).reduce<any>((acc, [frag, deps]) => {
      const paths = PathTree.toPaths(deps, d => !!d);
      const name = notNill(fragmentsState.get(frag)).name;
      console.log({ name, deps, paths });
      acc[name] = paths.map(path => Path.stringify(path));
      return acc;
    }, {}),
  };
}

export const DepsLayer = {
  create,
  addPath,
  toObject,
};
