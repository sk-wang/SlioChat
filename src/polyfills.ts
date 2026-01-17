import 'core-js/stable/array/at';
import 'core-js/stable/array/flat';
import 'core-js/stable/array/flat-map';
import 'core-js/stable/object/from-entries';
import 'core-js/stable/string/at';
import 'core-js/stable/string/replace-all';
import 'core-js/stable/promise/all-settled';
import 'core-js/stable/global-this';

export {};

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: any) => void;
    };
  }
  interface Array<T> {
    findLast(predicate: (value: T, index: number, array: T[]) => boolean): T | undefined;
    findLastIndex(predicate: (value: T, index: number, array: T[]) => boolean): number;
  }
  interface ObjectConstructor {
    hasOwn(obj: object, prop: PropertyKey): boolean;
  }
}

if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function <T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  };
}

if (!Array.prototype.findLast) {
  Array.prototype.findLast = function <T>(
    predicate: (value: T, index: number, array: T[]) => boolean
  ): T | undefined {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate(this[i], i, this)) {
        return this[i];
      }
    }
    return undefined;
  };
}

if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function <T>(
    predicate: (value: T, index: number, array: T[]) => boolean
  ): number {
    for (let i = this.length - 1; i >= 0; i--) {
      if (predicate(this[i], i, this)) {
        return i;
      }
    }
    return -1;
  };
}

if (!Object.hasOwn) {
  Object.hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}
