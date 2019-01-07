import { FragmentAny, InputRef, ProxyType, Path } from './types';
import { PathTree } from './PathTree';
import { notNill } from './utils';
import { INPUT, STATE } from './const';

export type TrackingLayer = {
  name: string;
  fragment: FragmentAny;
  input: any;
  trees: {
    input: PathTree<boolean>;
    state: PathTree<boolean>;
    fragments: Map<FragmentAny, Map<InputRef, PathTree<boolean>>>;
  };
};

function create(name: string, fragment: FragmentAny, input: any): TrackingLayer {
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

function getPathTree(layer: TrackingLayer, type: ProxyType, input: InputRef): PathTree<boolean> {
  if (type === INPUT) {
    return layer.trees.input;
  }
  if (type === STATE) {
    return layer.trees.state;
  }
  if (!layer.trees.fragments.has(type)) {
    layer.trees.fragments.set(type, new Map());
  }
  const frag = notNill(layer.trees.fragments.get(type));
  if (!frag.has(input)) {
    frag.set(input, PathTree.create(false));
  }
  return notNill(frag.get(input));
}

function addPath(layer: TrackingLayer, type: ProxyType, input: InputRef, path: Path) {
  PathTree.addPath(getPathTree(layer, type, input), path, true);
}

export const TrackingLayer = {
  create,
  addPath,
  getPathTree,
};
