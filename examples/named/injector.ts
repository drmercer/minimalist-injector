import { InjectFn, InjectKey, injectable as origInjectable } from '../../injector';

export * from '../../injector';

export const injectablesByName = origInjectable<Record<string, unknown>>('ByName', () => {
  return {}; // populated lazily in injectable() below.
})

export function injectable<T>(name: string, factory: (inject: InjectFn) => T): InjectKey<T> {
  return origInjectable(name, (inject) => {
    const value = factory(inject);

    if (typeof value === 'object' && !!value) {
      (value as any)[Symbol.toStringTag] = name;
    }

    const byName = inject(injectablesByName);
    byName[name] = value;

    return value;
  });
}
