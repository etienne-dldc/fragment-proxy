type PathTree<Data> = Map<PathPart, PathTreeNode<Data>>;

type PathTreeNode<Data> = {
  data: Data;
  paths: PathTree<Data>;
};

function create<Data>(data: Data): PathTreeNode<Data> {
  return {
    paths: new Map<PathPart, PathTreeNode<Data>>(),
    data,
  };
}

// function merge<Data = void>(left: PathTree<Data>, right: PathTree<Data>): PathTree<Data> {
// function merge<Data = void>(left: PathTree<Data>, right: PathTree<Data>): PathTree<Data> {
//   const n = new PathTreeManager();
//   left.toPaths().forEach(n.add);
//   right.toPaths().forEach(n.add);
//   return n;
// }

function addPath<Data>(tree: PathTree<Data>, path: Path, data: Data): void {
  path.reduce<PathTree<Data>>((acc, key) => {
    if (!acc.has(key)) {
      acc.set(key, { paths: new Map(), data });
    }
    return notNill(acc.get(key)).paths;
  }, tree);
}

function toPaths<Data>(tree: PathTree<Data>): Array<Path> {
  const traverse = (map: PathTree<Data>): Array<Path> => {
    return Array.from(map.entries())
      .map(([key, val]) => {
        const sub = traverse(val.paths);
        if (sub.length === 0) {
          return [[key]];
        }
        return sub.map(p => [key, ...p]);
      })
      .reduce<Array<Path>>((acc, v) => {
        return acc.concat(v);
      }, []);
  };
  return traverse(tree);
}

function toObject<Data>(tree: PathTree<Data>): object {
  const toObj = (map: PathTree<Data>): object => {
    return Array.from(map.entries()).reduce<object>((acc, [key, val]) => {
      (acc as any)[String(key)] = toObj(val.paths);
      return acc;
    }, {});
  };
  return toObj(tree);
}

export const PathTree = {
  addPath,
  toObject,
  toPaths,
};
