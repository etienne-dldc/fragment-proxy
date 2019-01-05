import { FragmentAny, ROOT, PATH, FragmentState, InputRef } from './types';
import { Path } from './Path';
import { PathTree } from './PathTree';
import { notNill } from './utils';

export const ROOT_INPUT = Symbol('ROOT_INPUT');

export type Root = (typeof ROOT_INPUT) | FragmentAny;

export type DepsLayer = {
  name: string;
  ref: any;
  input: PathTree<boolean>;
  frag: Map<FragmentAny, Map<InputRef, PathTree<boolean>>>;
};

function create(name: string, ref: any): DepsLayer {
  return {
    name,
    ref,
    input: PathTree.create(false),
    frag: new Map(),
  };
}

function getPathTree(layer: DepsLayer, root: Root, input: InputRef): PathTree<boolean> {
  if (root === ROOT_INPUT) {
    return layer.input;
  }
  if (!layer.frag.has(root)) {
    layer.frag.set(root, new Map());
  }
  const frag = notNill(layer.frag.get(root));
  if (!frag.has(input)) {
    frag.set(input, PathTree.create(false));
  }
  return notNill(frag.get(input));
}

function addPath(layer: DepsLayer, root: Root, input: InputRef, path: Path) {
  PathTree.addPath(getPathTree(layer, root, input), path, true);
}

function toObject(layer: DepsLayer | null, fragmentsState: Map<FragmentAny, FragmentState>): object | null {
  if (layer === null) {
    return null;
  }
  return {
    input: PathTree.toPaths(layer.input, d => !!d).map(path => Path.stringify(path)),
    frag: Array.from(layer.frag.entries()).reduce<any>((acc, [frag, deps]) => {
      const name = notNill(fragmentsState.get(frag)).name;
      const content = Array.from(deps.entries()).map(([input, tree]) => {
        return {
          input,
          paths: PathTree.toPaths(tree, d => !!d).map(path => Path.stringify(path)),
        };
      });
      acc[name] = content;
      return acc;
    }, {}),
  };
}

export const DepsLayer = {
  create,
  addPath,
  getPathTree,
  toObject,
};
