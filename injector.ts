class InjectableKey<T> {
  private IfYoureSeeingThisInAnErrorMessageItMeansYoureTryingToUseSomethingAsAnInjectableKeyWhenItsNotOne!: T;
  constructor(
    public injectableName: string,
  ) { }
}
export type { InjectableKey };

type InjectableValues<Deps> = {
  [K in keyof Deps]: Deps[K] extends InjectableKey<infer T> ? T : never;
}

interface InjectableData<T> {
  deps: readonly InjectableKey<unknown>[];
  factory: (...args: any) => T;
}

const metadata = new WeakMap<InjectableKey<unknown>, InjectableData<unknown>>();

export function injectable<T, Deps extends readonly InjectableKey<unknown>[]>(
  name: string,
  // Makes me sad that this signature isn't very clean, but at least it's user-friendly and doesn't require "as const"
  ...rest: [
    ...deps: Deps,
    factory: (...args: InjectableValues<Deps>) => T,
  ]
): InjectableKey<T> {
  const deps = rest.slice(0, -1);
  const [factory] = rest.slice(-1);
  const key = new InjectableKey<T>(name);
  metadata.set(key, {
    deps: deps as unknown as Deps,
    factory: factory as (...args: InjectableValues<Deps>) => T,
  });
  return key;
}

function getInjectableData<T>(key: InjectableKey<T>) {
  return metadata.get(key) as InjectableData<T>;
}

export const InjectorKey: InjectableKey<Injector> = new InjectableKey('Injector');

export class Injector {
  private instances: WeakMap<InjectableKey<unknown>, any> = new WeakMap();
  /** Only for usage from debugger */
  private byName: Record<string, any> | undefined = this.debug ? {} : undefined;

  constructor(private debug: boolean = false) { }

  public get<T>(key: InjectableKey<T>): T {
    if (this.byName && typeof key === 'string') {
      return this.byName[key];
    }
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }
    if (key === InjectorKey as unknown) {
      return this as unknown as T;
    }
    const instance = this.create(key);
    this.instances.set(key, instance);
    if (this.byName) {
      this.byName[key.injectableName] = instance;
    }
    return instance;
  }

  private create<T>(key: InjectableKey<T>): T {
    const { factory, deps } = getInjectableData(key);
    const depValues = deps.map(dep => this.get(dep));
    return factory(...depValues);
  }
}
