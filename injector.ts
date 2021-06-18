/**
 * A key for an injectable dependency. Can be exchanged for a T (the dependency itself) via an Injector.
 */
export interface InjectKey<T> {
  /**
   * The default factory for this InjectKey. This is exposed for advanced usages, but you typically won't
   * need this. Instead, pass this InjectKey to an Injector.
   */
  _create: (inject: Injector) => T;
}

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

/**
 * Creates a new injectable (a "module" or "component" that can be obtained from an Injector), returning
 * a new InjectKey that maps to that injectable.
 *
 * @param factory
 *  The factory function that is invoked to create the value. The first parameter is an Injector that
 *   can be used to get the values of other injectables.
 * @returns
 *  The InjectKey corresponding to the new injectable.
 */
export function injectable<T>(factory: (inject: Injector) => T): InjectKey<T> {
  return { _create: factory };
}

/**
 * Specifies that `overrider` should be used when `overridden` is requested from this injector.
 *
 * These should be created using `override()` for type-safety. Otherwise, TS will allow the
 * `overridden` value to be a subtype of the `overrider` value, which is incorrect.
 */
export type Override<A, B extends A = A> = [overridden: InjectKey<A>, overrider: InjectKey<B>];

/**
 * A utility for creating new Overrides. Using this function (without explicit type params)
 * ensures that `b` is actually assignable to `a`.
 */
export function override<A, B extends A>(a: InjectKey<A>, b: InjectKey<B>): Override<A, B> {
  return [a, b];
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
 *   override(A, B);
 * ]);
 *
 * const b: string = inject(B);
 *
 * console.log(b); // 'Hello, dependency injection!'
 * ```
 */
export function makeInjector(overrides: Override<unknown, unknown>[] = []): Injector {

  const values: WeakMap<InjectKey<unknown>, any> = new WeakMap();
  const overridesMap: Map<InjectKey<unknown>, InjectKey<unknown>> = new Map(overrides);

  function get<T>(key: InjectKey<T>): T {
    const overrider: InjectKey<T> = overridesMap.get(key) as InjectKey<T>;
    if (overrider) {
      return get(overrider);
    }
    if (values.has(key)) {
      return values.get(key);
    }
    const value = key._create(get);
    values.set(key, value);
    return value;
  }

  return get;
}
