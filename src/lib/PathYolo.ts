import { notNill } from './utils';

export type PathPart = string | number | symbol;

export type Path = Array<PathPart>;

export function stringifyPath(path: Path): string {
  return path.map(v => String(v)).join('.');
}

export function pathsEqual(left: Path, right: Path): boolean {
  if (left.length !== right.length) return false;
  return left.every((v, i) => v === right[i]);
}
