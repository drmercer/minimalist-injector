/**
 * A key for an injectable dependency. Can be exchanged for a T (the dependency itself) via an Injector.
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
export type Injector = <T>(key: InjectKey<T>) => T;

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
  factory: (inject: Injector) => T;
}

const metadata = new WeakMap<InjectKey<unknown>, InjectableData<unknown>>();

/**
 * Creates a new injectable (a "module" or "component" that can be obtained from an Injector), returning
 * a new InjectKey that maps to that injectable.
 *
 * @param name
 *   The human-readable name of the component, for debugging.
 * @param factory
 *  The factory function that is invoked to create the value. The first parameter is an Injector that
 *   can be used to get the values of other injectables.
 * @returns
 *  The InjectKey corresponding to the new injectable.
 */
export function injectable<T>(
  name: string,
  factory: (inject: Injector) => T,
): InjectKey<T> {
  const key = new InjectKey<T>(name);
  metadata.set(key, {
    factory,
  });
  return key;
}

/**
 * Specifies that `overrider` should be used when `overridden` is requested from this injector.
 *
 * These should be created using `override()` for type-safety. Otherwise, TS will allow the
 * `overridden` value to be a subtype of the `overrider` value, which is incorrect.
 */
export interface Override<T, U extends T> {
  overridden: InjectKey<T>;
  overrider: InjectKey<U>;
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
  public withOther<U extends T>(overrider: InjectKey<U>): Override<T, U> {
    return { overridden: this.overridden, overrider };
  }

  /**
   * When `overridden` is requested, the given value will be used instead.
   * @param value
   * @returns
   */
  public withValue<U extends T>(value: U): Override<T, U> {
    return {
      overridden: this.overridden,
      overrider: injectable<U>(`<explicit value overriding ${this.overridden.injectableName}>`, () => value),
    };
  }
}

/**
 * Creates a new dependency injector (an `Injector`) that uses the given overrides.
 *
 * Example usage:
 *
 * ```ts
 * const A = injectable('A', () => 'world');
 *
 * const A2 = injectable('A2', () => 'dependency injection');
 *
 * const B = injectable('B', inject => `Hello, ${inject(A)}`);
 *
 * // Basic usage:
 *
 * const inject = makeInjector();
 *
 * const b: string = inject(B);
 *
 * console.log(B); // 'Hello, world!'
 *
 * // With override:
 *
 * const inject = makeInjector([
 *   override(A).withOther(B);
 * ]);
 *
 * const b: string = inject(B);
 *
 * console.log(b); // 'Hello, dependency injection!'
 * ```
 */
export function makeInjector(overrides: Override<unknown, unknown>[] = []): Injector {

  const instances: WeakMap<InjectKey<unknown>, any> = new WeakMap();
  const overridesMap: Map<InjectKey<unknown>, InjectKey<unknown>> = new Map(overrides.map(o => [o.overridden, o.overrider]));

  const get: Injector = <T>(key: InjectKey<T>): T => {
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

  return get;
}
