import { Injector, InjectKey, injectable as _injectable } from '../../injector';

export * from '../../injector';

export const injectablesByName = _injectable<Record<string, unknown>>(() => {
  return {}; // populated lazily in injectable() below.
})

export function injectable<T>(name: string, factory: (inject: Injector) => T): InjectKey<T> {
  return _injectable((inject) => {
    const value = factory(inject);

    if (typeof value === 'object' && !!value) {
      (value as any)[Symbol.toStringTag] = name;
    }

    const byName = inject(injectablesByName);
    byName[name] = value;

    return value;
  });
}
