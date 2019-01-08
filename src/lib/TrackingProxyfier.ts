import isPlainObj from 'is-plain-obj';
import { PathTree } from './PathTree';
import { InputRef, ProxyType, FragmentAny, Path } from './types';
import { notNill } from './utils';
import { TrackingLayer } from './TrackingLayer';
import { IS_PROXY, PATH, ROOT, VALUE, INPUT } from './const';

export type UnwrapedPath = {
  type: ProxyType;
  path: Path;
  input: InputRef;
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

export class TrackingProxyfier {
  private layers: Array<TrackingLayer> = [];

  private getLayer(): TrackingLayer {
    if (this.layers.length === 0) {
      throw new Error('No layers ?');
    }
    return this.layers[this.layers.length - 1];
  }

  getLayerPath(): Array<{ fragment: FragmentAny; input: any }> {
    return this.layers.map(layer => ({ fragment: layer.fragment, input: layer.input }));
  }

  getLastLayer(): TrackingLayer | null {
    return this.layers[this.layers.length - 1] || null;
  }

  pushLayer(name: string, fragment: FragmentAny, input: any) {
    this.layers.push(TrackingLayer.create(name, fragment, input));
  }

  popLayer(): TrackingLayer {
    return notNill(this.layers.pop());
  }

  getLayersCount(): number {
    return this.layers.length;
  }

  private getPathTree(type: ProxyType, input: any): PathTree<boolean> {
    const layer = this.getLayer();
    return TrackingLayer.getPathTree(layer, type, input);
  }

  private addPath(type: ProxyType, input: any, path: Path) {
    PathTree.addPath(this.getPathTree(type, input), path, true);
  }

  private createArrayProxy<T extends Array<any>>(value: T, type: ProxyType, input: any, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return type;
        if (prop === VALUE) return value;
        if (prop === INPUT) return input;

        if (prop === 'length') {
          this.addPath(type, input, path);
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
              this.addPath(type, input, path);
              const mapped = target.map((v, i) => this.proxify(v, type, input, [...path, i]));
              return mapped.find(finder);
            };
          }
          if (prop === 'map') {
            return (mapper: any) => {
              this.addPath(type, input, path);
              return target.map((val, i, arr) => {
                return mapper(this.proxify(val, type, input, [...path, i]), i, this.proxify(arr, type, input, path));
              });
            };
          }
          throw new Error(`Not supported method ${prop}`);
        }

        const nestedPath = [...path, prop];

        return this.proxify((target as any)[prop], type, input, nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
    };

    return new Proxy(value, handlers);
  }

  private createObjectProxy<T extends object>(value: T, type: ProxyType, input: any, path: Path): T {
    const handlers: ProxyHandler<T> = {
      get: (target, prop) => {
        if (prop === IS_PROXY) return true;
        if (prop === PATH) return path;
        if (prop === ROOT) return type;
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

        return this.proxify(targetValue, type, input, nestedPath);
      },
      set: (target, prop, value) => {
        throw new Error(`Not allowed`);
      },
      deleteProperty: (target, prop) => {
        throw new Error(`Not allowed`);
      },
      ownKeys: target => {
        this.addPath(type, input, path);
        return Reflect.ownKeys(target);
      },
    };

    return new Proxy(value, handlers);
  }

  proxify<T extends any>(value: T, type: ProxyType, input: any, path: Path = []): T {
    if (value) {
      if (value[IS_PROXY]) {
        // re-proxy to set correct type & path
        return this.proxify(value[VALUE], type, input, path);
      } else if (isPlainObj(value)) {
        return this.createObjectProxy(value as any, type, input, path);
      } else if (Array.isArray(value)) {
        return this.createArrayProxy(value, type, input, path);
      }
    }
    if (this.layers.length > 0) {
      this.addPath(type, input, path);
    }
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
        path: value[PATH],
        type: value[ROOT],
        input: value[INPUT],
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
