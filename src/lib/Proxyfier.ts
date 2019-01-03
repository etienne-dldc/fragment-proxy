import isPlainObj from 'is-plain-obj';
import { Path, pathsEqual, PathTreeManager } from './PathYolo';

export const IS_PROXY = Symbol('IS_PROXY');
export const PATH = Symbol('PATHS');
export const VALUE = Symbol('VALUE');

export const KEYS = Symbol('KEYS');

export type Tracked = {
  paths: Array<Path>;
  value: any;
};

const arrayMutations = new Set(['push', 'shift', 'pop', 'unshift', 'splice', 'reverse', 'sort', 'copyWithin']);

export class Proxyfier {
  private pathManagers: Array<PathTreeManager> = [];

  private getPathManager(): PathTreeManager {
    if (this.pathManagers.length === 0) {
      throw new Error(`No path manager ??`);
    }
    return this.pathManagers[this.pathManagers.length - 1];
  }

  private createArrayProxy<T extends Array<any>>(value: T, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === VALUE) return value;

        if (prop === 'length') {
          this.getPathManager().add([...path, KEYS]);
          return target.length;
        }

        if (typeof prop === 'symbol') {
          throw new Error(`Not allowed`);
        }

        if (typeof (target as any)[prop] === 'function') {
          if (arrayMutations.has(String(prop))) {
            throw new Error(`Not allowed`);
          }
          if (prop === 'find') {
            return (finder: any) => {
              this.getPathManager().add(path);
              const mapped = target.map((v, i) => this.proxify(v, [...path, i]));
              return mapped.find(finder);
            };
          }
          if (prop === 'map') {
            return (mapper: any) => {
              this.getPathManager().add(path);
              return target.map((val, i, arr) => {
                return mapper(this.proxify(val, [...path, i]), i, this.proxify(arr, path));
              });
            };
          }
          throw new Error(`Not supported methof ${prop}`);
        }

        const nestedPath = [...path, prop];

        return this.proxify((target as any)[prop], nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
    };

    return new Proxy(value, handlers);
  }

  private createObjectProxy<T extends object>(value: T, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
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

        const targetValue = (target as any)[prop];
        const nestedPath = [...path, prop];

        if (typeof targetValue === 'function') {
          throw new Error(`function are not supportted`);
        }

        return this.proxify(targetValue, nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
      deleteProperty: (target, prop) => {
        throw new Error(`Not allowed`);
      },
      ownKeys: target => {
        this.getPathManager().add(path);
        return Reflect.ownKeys(target);
      },
    };

    return new Proxy(value, handlers);
  }

  private isProxy(value: any): boolean {
    return value && value[IS_PROXY];
  }

  resolveTracked(value: any): Tracked {
    if (this.isProxy(value)) {
      return {
        paths: [value[PATH]],
        value: value[VALUE],
      };
    }
    if (isPlainObj(value)) {
      const paths: Array<Path> = [];
      const resValue: { [key: string]: any } = {};
      Object.keys(value).forEach(key => {
        const res = this.resolveTracked(value[key]);
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
        const res = this.resolveTracked(val);
        paths.push(...res.paths);
        return res.value;
      });
      return {
        paths,
        value: resValue,
      };
    }
    // console.info(`Ignore ${typeof value}`);
    return {
      paths: [],
      value,
    };
  }

  pushPathManager(pathManager: PathTreeManager) {
    this.pathManagers.push(pathManager);
  }

  popPathManager() {
    this.pathManagers.pop();
  }

  proxify<T extends any>(value: T, path: Path = []): T {
    if (value) {
      if (value[IS_PROXY]) {
        // re-proxy to set correct path & pathManager
        return this.proxify(value[VALUE], path);
      } else if (isPlainObj(value)) {
        return this.createObjectProxy(value as any, path);
      } else if (Array.isArray(value)) {
        return this.createArrayProxy(value, path);
      }
    }
    this.getPathManager().add(path);
    return value;
  }
}
