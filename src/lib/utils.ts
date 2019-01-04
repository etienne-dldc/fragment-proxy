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
