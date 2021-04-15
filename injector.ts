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

export class Injector {
  public static Self: InjectKey<Injector> = new InjectKey('Injector');

  private instances: WeakMap<InjectKey<unknown>, any> = new WeakMap();
  private overrides: Map<InjectKey<unknown>, InjectKey<unknown>>;

  constructor(overrides: Override<unknown>[] = []) {
    this.overrides = new Map(overrides.map(o => [o.overridden, o.overrider]));
  }

  public get<T>(key: InjectKey<T>): T {
    return this._get(key, []);
  }

  private _get<T>(key: InjectKey<T>, overriddenKeys: InjectKey<T>[]): T {
    if (this.overrides.has(key)) {
      const overrider = this.overrides.get(key) as InjectKey<T>;
      const newOverriddenKeys = [...overriddenKeys, key];
      // Check for circular dependency
      if (newOverriddenKeys.includes(overrider)) {
        const message: string = [...newOverriddenKeys, overrider].map(k => k.injectableName).join(' -> ');
        throw new Error("Circular override dependencies: " + message);
      }
      return this._get(overrider, newOverriddenKeys);
    }
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }
    if (key === Injector.Self as InjectKey<unknown>) {
      return this as unknown as T;
    }
    const instance = this.create(key);
    this.instances.set(key, instance);
    return instance;
  }

  private create<T>(key: InjectKey<T>): T {
    const { factory } = metadata.get(key) as InjectableData<T>;
    return factory(this.get.bind(this));
  }
}
