class InjectKey<T> {
  private IfYoureSeeingThisInAnErrorMessageItMeansYoureTryingToUseSomethingAsAnInjectKeyWhenItsNotOne!: T;
  constructor(
    public injectableName: string,
  ) { }
}
export type { InjectKey };

export type InjectedValue<K extends InjectKey<unknown>> = K extends InjectKey<infer T> ? T : never;

type DepValues<DepKeys extends readonly InjectKey<unknown>[]> = {
  [K in keyof DepKeys]: DepKeys[K] extends InjectKey<unknown> ? InjectedValue<DepKeys[K]> : never;
}

interface InjectableData<T> {
  deps: readonly InjectKey<unknown>[];
  factory: (...args: any) => T;
}

const metadata = new WeakMap<InjectKey<unknown>, InjectableData<unknown>>();

export function injectable<T, DepKeys extends readonly InjectKey<unknown>[]>(
  name: string,
  // Makes me sad that this signature isn't very clean, but at least it's user-friendly and doesn't require "as const"
  ...rest: [
    ...deps: DepKeys,
    factory: (...args: DepValues<DepKeys>) => T,
  ]
): InjectKey<T> {
  const deps = rest.slice(0, -1);
  const [factory] = rest.slice(-1);
  const key = new InjectKey<T>(name);
  metadata.set(key, {
    deps: deps as unknown as DepKeys,
    factory: factory as (...args: DepValues<DepKeys>) => T,
  });
  return key;
}

export const InjectorKey: InjectKey<Injector> = new InjectKey('Injector');

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
        overrider: injectable<T, []>('explicit value', () => value),
      };
    },
  };
}

export class Injector {
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
    if (key === InjectorKey as unknown) {
      return this as unknown as T;
    }
    const instance = this.create(key);
    this.instances.set(key, instance);
    return instance;
  }

  private create<T>(key: InjectKey<T>): T {
    const { factory, deps } = metadata.get(key) as InjectableData<T>;
    const depValues = deps.map(dep => this.get(dep));
    return factory(...depValues);
  }
}
