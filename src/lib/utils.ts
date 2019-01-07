export function notNill<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error(`Ivariant nill value !`);
  }
  return val;
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
