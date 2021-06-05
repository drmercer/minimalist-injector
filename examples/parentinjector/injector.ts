import { injectable as _injectable, InjectKey, Injector, makeInjector as _makeInjector, override, Override } from '../../injector';

export * from '../../injector';

export const ParentInjector = _injectable<Injector | undefined>(() => undefined);

export function makeInjector(overrides: Override<unknown>[] = [], parent?: Injector): Injector {
  return _makeInjector([
    ...overrides,
    ...(parent ? [
      override(ParentInjector, _injectable(() => parent))
    ] : []),
  ]);
}

export function injectable<T>(factory: (inject: Injector) => T): InjectKey<T> {
  const key: InjectKey<T> = _injectable<T>((_inject) => {
    const parent = _inject(ParentInjector);
    // before calling the factory, check if the parent has this injectable.
    if (parent) {
      return parent(key);
    } else {
      return factory(_inject);
    }
  })
  return key;
}
