/**
 * A key for an injectable dependency. Can be exchanged for a T (the dependency itself) via an InjectFn,
 * such as the one passed to the injectable factory or the one returned from makeInjector().
 */
class InjectKey<T> {
  private IfYoureSeeingThisInAnErrorMessageItMeansYoureTryingToUseSomethingAsAnInjectKeyWhenItsNotOne!: T;
  constructor(
    public injectableName: string,
  ) { }
}
export type { InjectKey };

/**
 * A function that takes an InjectKey and returns the value that key is mapped to, constructing the value
 * if necessary.
 */
export type InjectFn = <T>(key: InjectKey<T>) => T;

/**
 * A utility type that evaluates to the "T" given an InjectKey<T>. This allows you to do things like:
 *
 * ```ts
 * export type Foo = InjectedValue<typeof Foo>; // resolves to { foo(): void, bar(): void }
 *
 * export const Foo = injectable(() => {
 *   return {
 *     foo() {
 *       console.log("foo");
 *     },
 *     bar() {
 *       console.log("bar");
 *     },
 *   };
 * }})
 * ```
 */
export type InjectedValue<K extends InjectKey<unknown>> = K extends InjectKey<infer T> ? T : never;

interface InjectableData<T> {
  factory: (inject: InjectFn) => T;
}

const metadata = new WeakMap<InjectKey<unknown>, InjectableData<unknown>>();

/**
 * Creates a new injectable (a "module" or "component" that can be obtained from an InjectFn), returning
 * a new InjectKey that maps to that injectable.
 *
 * @param name
 *   The human-readable name of the component, for debugging.
 * @param factory
 *  The factory function that is invoked to create the value. The first parameter is an InjectFn that
 *   can be used to get the values of other injectables.
 * @returns
 *  The InjectKey corresponding to the new injectable.
 */
export function injectable<T>(
  name: string,
  factory: (inject: InjectFn) => T,
): InjectKey<T> {
  const key = new InjectKey<T>(name);
  metadata.set(key, {
    factory,
  });
  return key;
}

/**
 * Specifies that `overrider` should be used when `overridden` is requested from this injector.
 */
export interface Override<T> {
  overridden: InjectKey<T>;
  overrider: InjectKey<T>;
}

/**
 * A utility for creating new Overrides.
 */
export function override<T>(overridden: InjectKey<T>) {
  return new OverrideBuilder(overridden);
}

export class OverrideBuilder<T> {
  constructor(
    public readonly overridden: InjectKey<T>,
  ) { }

  /**
   * When `overridden` is requested, the `overrider` will be requested instead.
   */
  public withOther(overrider: InjectKey<T>): Override<T> {
    return { overridden: this.overridden, overrider };
  }

  /**
   * When `overridden` is requested, the given value will be used instead.
   * @param value
   * @returns
   */
  public withValue(value: T): Override<T> {
    return {
      overridden: this.overridden,
      overrider: injectable<T>(`<explicit value overriding ${this.overridden.injectableName}>`, () => value),
    };
  }
}

/**
 * Creates a new dependency injector (an InjectFn) that uses the given overrides.
 *
 * Returns an array for future-compatibility, in case I ever have other things to
 * return in addition to the InjectFn.
 */
export function makeInjector(overrides: Override<unknown>[] = []): [InjectFn] {

  const instances: WeakMap<InjectKey<unknown>, any> = new WeakMap();
  const overridesMap: Map<InjectKey<unknown>, InjectKey<unknown>> = new Map(overrides.map(o => [o.overridden, o.overrider]));

  const get: InjectFn = <T>(key: InjectKey<T>): T => {
    return _get(key, []);
  };

  function _get<T>(key: InjectKey<T>, overriddenKeys: InjectKey<T>[]): T {
    if (overridesMap.has(key)) {
      const overrider = overridesMap.get(key) as InjectKey<T>;
      const newOverriddenKeys = [...overriddenKeys, key];
      // Check for circular dependency
      if (newOverriddenKeys.includes(overrider)) {
        const message: string = [...newOverriddenKeys, overrider].map(k => k.injectableName).join(' -> ');
        throw new Error("Circular override dependencies: " + message);
      }
      return _get(overrider, newOverriddenKeys);
    }
    if (instances.has(key)) {
      return instances.get(key);
    }
    const instance = create(key);
    instances.set(key, instance);
    return instance;
  }

  function create<T>(key: InjectKey<T>): T {
    const { factory } = metadata.get(key) as InjectableData<T>;
    return factory(get);
  }

  return [get];
}
