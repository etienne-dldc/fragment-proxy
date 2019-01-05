import isPlainObj from 'is-plain-obj';
import { Path } from './Path';
import { PathTree } from './PathTree';
import { ROOT, PATH, IS_PROXY, VALUE, INPUT, InputRef, FragmentAny } from './types';
import { notNill } from './utils';
import { Root, DepsLayer } from './DepsLayer';

export type UnwrapedPath = {
  [ROOT]: Root;
  [PATH]: Path;
  [INPUT]: InputRef;
};

export type Unwraped = {
  paths: Array<UnwrapedPath>;
  value: any;
  shape: any;
};

const ARRAY_MUTATION_METHODS_NAMES = new Set([
  'push',
  'shift',
  'pop',
  'unshift',
  'splice',
  'reverse',
  'sort',
  'copyWithin',
]);

export class Proxyfier {
  private layers: Array<DepsLayer> = [];

  private getLayer(): DepsLayer {
    if (this.layers.length === 0) {
      throw new Error('No layers ?');
    }
    return this.layers[this.layers.length - 1];
  }

  getLastLayer(): DepsLayer | null {
    return this.layers[this.layers.length - 1] || null;
  }

  pushLayer(name: string, self: any) {
    this.layers.push(DepsLayer.create(name, self));
  }

  popLayer(): DepsLayer {
    return notNill(this.layers.pop());
  }

  getLayersCount(): number {
    return this.layers.length;
  }

  private getPathTree(root: Root, input: any): PathTree<boolean> {
    const layer = this.getLayer();
    return DepsLayer.getPathTree(layer, root, input);
  }

  private addPath(root: Root, input: any, path: Path) {
    PathTree.addPath(this.getPathTree(root, input), path, true);
  }

  private createArrayProxy<T extends Array<any>>(value: T, root: Root, input: any, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return root;
        if (prop === VALUE) return value;
        if (prop === INPUT) return input;

        if (prop === 'length') {
          this.addPath(root, input, path);
          return target.length;
        }

        if (typeof prop === 'symbol') {
          throw new Error(`Not allowed`);
        }

        if (typeof (target as any)[prop] === 'function') {
          if (ARRAY_MUTATION_METHODS_NAMES.has(String(prop))) {
            throw new Error(`Not allowed`);
          }
          if (prop === 'find') {
            return (finder: any) => {
              this.addPath(root, input, path);
              const mapped = target.map((v, i) => this.proxify(v, root, input, [...path, i]));
              return mapped.find(finder);
            };
          }
          if (prop === 'map') {
            return (mapper: any) => {
              this.addPath(root, input, path);
              return target.map((val, i, arr) => {
                return mapper(this.proxify(val, root, input, [...path, i]), i, this.proxify(arr, root, input, path));
              });
            };
          }
          throw new Error(`Not supported methof ${prop}`);
        }

        const nestedPath = [...path, prop];

        return this.proxify((target as any)[prop], root, input, nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
    };

    return new Proxy(value, handlers);
  }

  private createObjectProxy<T extends object>(value: T, root: Root, input: any, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return root;
        if (prop === VALUE) return value;
        if (prop === INPUT) return input;

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

        return this.proxify(targetValue, root, input, nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
      deleteProperty: (target, prop) => {
        throw new Error(`Not allowed`);
      },
      ownKeys: target => {
        this.addPath(root, input, path);
        return Reflect.ownKeys(target);
      },
    };

    return new Proxy(value, handlers);
  }

  proxify<T extends any>(value: T, root: Root, input: any, path: Path = []): T {
    if (value) {
      if (value[IS_PROXY]) {
        // re-proxy to set correct path & root
        return this.proxify(value[VALUE], root, input, path);
      } else if (isPlainObj(value)) {
        return this.createObjectProxy(value as any, root, input, path);
      } else if (Array.isArray(value)) {
        return this.createArrayProxy(value, root, input, path);
      }
    }
    this.addPath(root, input, path);
    return value;
  }

  private isProxy(value: any): boolean {
    return value && value[IS_PROXY];
  }

  unproxify<V extends any>(value: V): V {
    if (this.isProxy(value)) {
      return value[VALUE];
    }
    return value;
  }

  unwrap(value: any): Unwraped {
    if (this.isProxy(value)) {
      const shape: UnwrapedPath = {
        [PATH]: value[PATH],
        [ROOT]: value[ROOT],
        [INPUT]: value[INPUT],
      };

      return {
        paths: [shape],
        value: value[VALUE],
        shape: shape,
      };
    }
    if (isPlainObj(value)) {
      const paths: Array<UnwrapedPath> = [];
      const resValue: { [key: string]: any } = {};
      const resShape: { [key: string]: any } = {};
      Object.keys(value).forEach(key => {
        const res = this.unwrap(value[key]);
        paths.push(...res.paths);
        resValue[key] = res.value;
        resShape[key] = res.shape;
      });
      return {
        paths,
        value: resValue,
        shape: resShape,
      };
    }
    if (Array.isArray(value)) {
      const paths: Array<UnwrapedPath> = [];
      const resShape: Array<any> = [];
      const resValue = value.map(val => {
        const res = this.unwrap(val);
        paths.push(...res.paths);
        resShape.push(res.shape);
        return res.value;
      });
      return {
        paths,
        value: resValue,
        shape: resShape,
      };
    }
    // console.info(`Ignore ${typeof value}`);
    return {
      paths: [],
      value,
      shape: value,
    };
  }
}
