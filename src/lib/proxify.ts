import isPlainObj from 'is-plain-obj';

export const IS_PROXY = Symbol('IS_PROXY');
export const IS_TRACKED = Symbol('IS_TRACKED');
export const PATHS = Symbol('PATHS');
export const VALUE = Symbol('VALUE');

export const KEYS = Symbol('KEYS');

export type Path = Array<string | number | symbol>;

const arrayMutations = new Set(['push', 'shift', 'pop', 'unshift', 'splice', 'reverse', 'sort', 'copyWithin']);

function createArrayProxy<T extends Array<any>>(
  value: T,
  onLeafAccess: (path: Path) => void,
  path: Path,
  paths: Array<Path>
): T {
  return new Proxy(value, {
    get(target, prop) {
      if (prop === IS_PROXY) return true;
      if (prop === PATHS) return [...paths, path];
      if (prop === VALUE) return value;

      if (prop === 'length') {
        onLeafAccess([...path, KEYS]);
        // createTracked(target[prop], [...paths, [...path, KEYS]]);
        return target.length;
      }

      if (typeof prop === 'symbol') {
        throw new Error(`Not allowed`);
      }

      if (typeof target[prop] === 'function') {
        if (arrayMutations.has(String(prop))) {
          throw new Error(`Not allowed`);
        }
        if (prop === 'find') {
          return (...args: any) => {
            onLeafAccess([...path, 'find']);
            const result = (target[prop] as any)(...args);
            if (result) {
              const index = target.indexOf(result);
              if (index === -1) {
                throw new Error('Whaat ??');
              }
              return proxify(result, onLeafAccess, [...path, index], paths);
            }
            return undefined;
          };
        }
        throw new Error(`Not supported methof ${prop}`);
      }

      const nestedPath = [...path, prop];

      return proxify(target[prop], onLeafAccess, nestedPath);
    },
    set(target, prop, value) {
      throw new Error(`Not allowed`);
    },
  });
}

function createObjectProxy<T extends object>(
  value: T,
  onLeafAccess: (path: Path) => void,
  path: Path,
  paths: Array<Path>
): T {
  return new Proxy(value, {
    get(target, prop) {
      if (prop === IS_PROXY) return true;
      if (prop === PATHS) return [...paths, path];
      if (prop === VALUE) return value;

      if (typeof prop === 'symbol') {
        throw new Error(`Not allowed`);
      }

      if (prop in Object.prototype) {
        throw new Error(`Not allowed`);
      }

      const descriptor = Object.getOwnPropertyDescriptor(target, prop);

      if (descriptor && 'get' in descriptor) {
        throw new Error(`getter are not supportted`);
      }

      const targetValue = target[prop];
      const nestedPath = [...path, prop];

      if (typeof targetValue === 'function') {
        throw new Error(`function are not supportted`);
      }

      return proxify(targetValue, onLeafAccess, nestedPath, paths);
    },
    set(target, prop, value) {
      throw new Error(`Not allowed`);
    },
    deleteProperty(target, prop) {
      throw new Error(`Not allowed`);
    },
  });
}

function pathEqual(left: Path, right: Path): boolean {
  if (left.length !== right.length) return false;
  return left.every((v, i) => v === right[i]);
}

export type Tracked = {
  paths: Array<Path>;
  value: any;
};

function isTracked(value: any): boolean {
  return value && (value[IS_PROXY] || value[IS_TRACKED]);
}

function getTrackedValue(value: any): any {
  if (!isTracked(value)) {
    throw new Error(`Not a tracked`);
  }
  return value[VALUE];
}

export function resolveTracked(value: any): Tracked {
  if (isTracked(value)) {
    return {
      paths: value[PATHS],
      value: value[VALUE],
    };
  }
  if (isPlainObj(value)) {
    const paths: Array<Path> = [];
    const resValue = {};
    Object.keys(value).forEach(key => {
      const res = resolveTracked(value[key]);
      paths.push(...res.paths);
      resValue[key] = res.value;
    });
    return {
      paths,
      value: resValue,
    };
  }
  if (Array.isArray(value)) {
    const paths: Array<Path> = [];
    const resValue = value.map(val => {
      const res = resolveTracked(val);
      paths.push(...res.paths);
      return res.value;
    });
    return {
      paths,
      value: resValue,
    };
  }
  throw new Error(`Unsuported ${typeof value}`);
}

export function proxify<T>(value: T, onLeafAccess: (path: Path) => void, path: Path = [], paths: Array<Path> = []): T {
  if (value) {
    if (value[IS_PROXY]) {
      if (pathEqual(value[PATHS], path)) {
        // already proxy but not same path => new proxy with correct path
        return proxify(value[VALUE], onLeafAccess, path, paths);
      }
      return value;
    } else if (isPlainObj(value)) {
      return createObjectProxy(value as any, onLeafAccess, path, paths);
    } else if (Array.isArray(value)) {
      return createArrayProxy(value, onLeafAccess, path, paths);
    }
  }
  onLeafAccess(path);
  return value;
}
