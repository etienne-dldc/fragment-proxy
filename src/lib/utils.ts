export function notNill<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error(`Ivariant nill value !`);
  }
  return val;
}
