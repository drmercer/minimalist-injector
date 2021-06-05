import { injectable, InjectKey, makeInjector as _makeInjector } from '../../injector';
import 'reflect-metadata';

type Constructor<T> = { new(...args: any[]): T };

const injectKeysByClass = new WeakMap<Constructor<unknown>, InjectKey<unknown>>();

function getInjectKey<T>(klass: Constructor<T>): InjectKey<T> {
  const injectKey = injectKeysByClass.get(klass);
  if (!injectKey) {
    throw new Error(klass.name + ' is not an InjectableClass!');
  }
  return injectKey as InjectKey<T>;
}

export function InjectableClass<T>(klass: Constructor<T>) {
  const paramTypes: Constructor<unknown>[] = Reflect.getMetadata('design:paramtypes', klass) || [];
  const paramKeys = paramTypes.map(getInjectKey);

  const injectKey = injectable<T>((inject) => {
    const params = paramKeys.map(inject);
    return new klass(...params);
  });

  injectKeysByClass.set(klass, injectKey);
}

export function makeInjector() {
  // TODO add support for overrides - left as an exercise to the reader ;)

  const inject = _makeInjector();

  return function <T>(klass: Constructor<T>): T {
    return inject(getInjectKey(klass));
  };
}
