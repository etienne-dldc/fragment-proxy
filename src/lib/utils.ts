export function notNill<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error(`Ivariant nill value !`);
  }
  return val;
}

export const range = (num: number) =>
  Array(num)
    .fill(null)
    .map((v, i) => i);

export const repeat = (char: string, count: number) =>
  range(count)
    .map(() => char)
    .join('');

export function arrayShallowEqual(left: Array<any>, right: Array<any>): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((v, i) => v === right[i]);
}

export function getOrSet<M extends Map<any, any>>(
  map: M,
  key: M extends Map<infer K, any> ? K : never,
  val: M extends Map<any, infer V> ? V : never
): M extends Map<any, infer V> ? V : never {
  if (!map.has(key)) {
    map.set(key, val);
  }
  return notNill(map.get(key));
}
