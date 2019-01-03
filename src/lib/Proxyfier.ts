import isPlainObj from 'is-plain-obj';
import { Path } from './Path';
import { PathTree } from './PathTree';
import { ROOT, PATH, IS_PROXY, VALUE } from './types';
import { notNill } from './utils';
import { Root, DepsLayer, ROOT_MAIN, ROOT_INPUT } from './DepsLayer';

export type PathWithRef = {
  [ROOT]: Root;
  [PATH]: Path;
};

export type Tracked = {
  paths: Array<PathWithRef>;
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

  pushLayer() {
    this.layers.push(DepsLayer.create());
  }

  popLayer(): DepsLayer {
    return notNill(this.layers.pop());
  }

  private getPathTree(root: Root): PathTree<boolean> {
    const layer = this.getLayer();
    if (root === ROOT_MAIN) {
      return layer.main;
    }
    if (root === ROOT_INPUT) {
      return layer.input;
    }
    if (!layer.frag.has(root)) {
      layer.frag.set(root, PathTree.create(false));
    }
    return notNill(layer.frag.get(root));
  }

  private addPath(root: Root, path: Path) {
    PathTree.addPath(this.getPathTree(root), path, true);
  }

  private createArrayProxy<T extends Array<any>>(value: T, path: Path, root: Root): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return root;
        if (prop === VALUE) return value;

        if (prop === 'length') {
          this.addPath(root, path);
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
              this.addPath(root, path);
              const mapped = target.map((v, i) => this.proxify(v, [...path, i], root));
              return mapped.find(finder);
            };
          }
          if (prop === 'map') {
            return (mapper: any) => {
              this.addPath(root, path);
              return target.map((val, i, arr) => {
                return mapper(this.proxify(val, [...path, i], root), i, this.proxify(arr, path, root));
              });
            };
          }
          throw new Error(`Not supported methof ${prop}`);
        }

        const nestedPath = [...path, prop];

        return this.proxify((target as any)[prop], nestedPath, root);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
    };

    return new Proxy(value, handlers);
  }

  private createObjectProxy<T extends object>(value: T, path: Path, root: Root): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return root;
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

        return this.proxify(targetValue, nestedPath, root);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
      deleteProperty: (target, prop) => {
        throw new Error(`Not allowed`);
      },
      ownKeys: target => {
        this.addPath(root, path);
        return Reflect.ownKeys(target);
      },
    };

    return new Proxy(value, handlers);
  }

  proxify<T extends any>(value: T, path: Path = [], root: Root): T {
    if (value) {
      if (value[IS_PROXY]) {
        // re-proxy to set correct path & root
        return this.proxify(value[VALUE], path, root);
      } else if (isPlainObj(value)) {
        return this.createObjectProxy(value as any, path, root);
      } else if (Array.isArray(value)) {
        return this.createArrayProxy(value, path, root);
      }
    }
    this.addPath(root, path);
    return value;
  }

  private isProxy(value: any): boolean {
    return value && value[IS_PROXY];
  }

  resolveTracked(value: any): Tracked {
    if (this.isProxy(value)) {
      const shape = {
        [PATH]: value[PATH],
        [ROOT]: value[ROOT],
      };

      return {
        paths: [shape],
        value: value[VALUE],
        shape: shape,
      };
    }
    if (isPlainObj(value)) {
      const paths: Array<PathWithRef> = [];
      const resValue: { [key: string]: any } = {};
      const resShape: { [key: string]: any } = {};
      Object.keys(value).forEach(key => {
        const res = this.resolveTracked(value[key]);
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
      const paths: Array<PathWithRef> = [];
      const resShape: Array<any> = [];
      const resValue = value.map(val => {
        const res = this.resolveTracked(val);
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
