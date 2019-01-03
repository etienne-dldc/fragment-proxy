export type PathPart = string | number | symbol;

export type Path = Array<PathPart>;

function stringify(path: Path): string {
  return path.map(v => String(v)).join('.');
}

function equal(left: Path, right: Path): boolean {
  if (left.length !== right.length) return false;
  return left.every((v, i) => v === right[i]);
}

export const Path = {
  stringify,
  equal,
};
