class InjectKey<T> {
  private IfYoureSeeingThisInAnErrorMessageItMeansYoureTryingToUseSomethingAsAnInjectKeyWhenItsNotOne!: T;
  constructor(
    public injectableName: string,
  ) { }
}
export type { InjectKey };

type DepValues<DepKeys extends readonly InjectKey<unknown>[]> = {
  [K in keyof DepKeys]: DepKeys[K] extends InjectKey<infer T> ? T : never;
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

function getInjectableData<T>(key: InjectKey<T>) {
  return metadata.get(key) as InjectableData<T>;
}

export const InjectorKey: InjectKey<Injector> = new InjectKey('Injector');

export class Injector {
  private instances: WeakMap<InjectKey<unknown>, any> = new WeakMap();

  constructor() { }

  public get<T>(key: InjectKey<T>): T {
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
    const { factory, deps } = getInjectableData(key);
    const depValues = deps.map(dep => this.get(dep));
    return factory(...depValues);
  }
}
