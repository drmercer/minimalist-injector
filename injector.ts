class InjectKey<T> {
  private IfYoureSeeingThisInAnErrorMessageItMeansYoureTryingToUseSomethingAsAnInjectKeyWhenItsNotOne!: T;
  constructor(
    public injectableName: string,
  ) { }
}
export type { InjectKey };

export type InjectedValue<K extends InjectKey<unknown>> = K extends InjectKey<infer T> ? T : never;

interface InjectableData<T> {
  factory: (inject: <U>(key: InjectKey<U>) => U) => T;
}

const metadata = new WeakMap<InjectKey<unknown>, InjectableData<unknown>>();

export function injectable<T>(
  name: string,
  factory: (inject: <U>(key: InjectKey<U>) => U) => T,
): InjectKey<T> {
  const key = new InjectKey<T>(name);
  metadata.set(key, {
    factory,
  });
  return key;
}

export interface Override<T> {
  overridden: InjectKey<T>;
  overrider: InjectKey<T>;
}

export function override<T>(overridden: InjectKey<T>) {
  return {
    withOther(overrider: InjectKey<T>): Override<T> {
      return { overridden, overrider };
    },
    withValue(value: T): Override<T> {
      return {
        overridden,
        overrider: injectable<T>(`<explicit value overriding ${overridden.injectableName}>`, () => value),
      };
    },
  };
}

export type InjectorFn = <T>(key: InjectKey<T>) => T;

export function makeInjector(overrides: Override<unknown>[] = []): [InjectorFn] {

  const instances: WeakMap<InjectKey<unknown>, any> = new WeakMap();
  const overridesMap: Map<InjectKey<unknown>, InjectKey<unknown>> = new Map(overrides.map(o => [o.overridden, o.overrider]));

  const get: InjectorFn = <T>(key: InjectKey<T>): T => {
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
