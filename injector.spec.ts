import { injectable, Injector, InjectorKey } from './injector';

const A = injectable('A', () => {
  return {
    foo: 'a',
  };
});

const B = injectable('B', A, (a) => {
  function getA(): unknown {
    return a;
  }

  return {
    getA,
    bar: 'b' + a.foo,
  };
});

const C = injectable('C', A, B, InjectorKey, (a, b, injector) => {
  return {
    bagel: 'c' + a.foo + b.bar,
    injector,
  };
});

describe('injector v2', () => {
  it('should work', () => {
    const injector = new Injector();
    const c = injector.get(C);
    const b = injector.get(B)
    const a = injector.get(A);

    expect(b.bar).toEqual('ba');
    expect(c.bagel).toEqual('caba');

    expect(b.getA()).toBe(a);
    expect(c.injector).toBe(injector);
  })
})
