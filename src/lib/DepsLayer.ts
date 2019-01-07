import { FragmentAny, InputRef, ProxyType, INPUT, STATE } from './types';
import { Path } from './Path';
import { PathTree } from './PathTree';
import { notNill } from './utils';

export type DepsLayer = {
  name: string;
  fragment: FragmentAny;
  input: any;
  trees: {
    input: PathTree<boolean>;
    state: PathTree<boolean>;
    fragments: Map<FragmentAny, Map<InputRef, PathTree<boolean>>>;
  };
};

function create(name: string, fragment: FragmentAny, input: any): DepsLayer {
  return {
    name,
    fragment,
    input,
    trees: {
      fragments: new Map(),
      input: PathTree.create(false),
      state: PathTree.create(false),
    },
  };
}

function getPathTree(layer: DepsLayer, root: ProxyType, input: InputRef): PathTree<boolean> {
  if (root === INPUT) {
    return layer.trees.input;
  }
  if (root === STATE) {
    return layer.trees.state;
  }
  if (!layer.trees.fragments.has(root)) {
    layer.trees.fragments.set(root, new Map());
  }
  const frag = notNill(layer.trees.fragments.get(root));
  if (!frag.has(input)) {
    frag.set(input, PathTree.create(false));
  }
  return notNill(frag.get(input));
}

function addPath(layer: DepsLayer, root: ProxyType, input: InputRef, path: Path) {
  PathTree.addPath(getPathTree(layer, root, input), path, true);
}

export const DepsLayer = {
  create,
  addPath,
  getPathTree,
};
