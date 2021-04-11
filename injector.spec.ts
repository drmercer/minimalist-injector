import { injectable, InjectedValue, InjectKey, Injector, InjectorKey, override } from './injector';

const A = injectable('A', () => {
  return {
    foo: 'a',
  };
});

const A2: InjectKey<InjectedValue<typeof A>> = injectable('A2', () => {
  return {
    foo: 'a2',
  };
});

const A3: InjectKey<InjectedValue<typeof A>> = injectable('A3', () => {
  return {
    foo: 'a3',
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

// Type tests:

// Should only be able to override a key with a key/value assignable to it
new Injector([
  // @ts-expect-error Should reject because doesn't include `foo: string`
  override(A).withValue({ foo2: 'A' }),
]);

// @ts-expect-error Should properly type the InjectKey based on the return value of the factory fn
const BadReturnValue: InjectKey<{ a: boolean }> = injectable('BadReturnValue', A, B, InjectorKey, (a, b, injector) => {
  return {
    b: true,
  };
});

// @ts-expect-error Should complain if extra deps are expected
const UndeclaredDep = injectable('UndeclaredDep', A, (a, b) => {
  return {
    foo: true,
  };
});

// @ts-expect-error Should complain if deps are typed incorrectly
const MisdeclaredDep = injectable('MisdeclaredDep', A, (a: { bar: string }) => {
  return {
    foo: true,
  };
});

// Behavior tests:

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

  it('should allow overriding with key', () => {
    const injector = new Injector([
      override(A).withOther(A2),
    ]);
    const c = injector.get(C);
    const b = injector.get(B)
    const a = injector.get(A);

    expect(a.foo).toEqual('a2');
    expect(b.bar).toEqual('ba2');
    expect(c.bagel).toEqual('ca2ba2');

    expect(b.getA()).toBe(a);
    expect(c.injector).toBe(injector);
  })

  it('should allow overriding with value', () => {
    const injector = new Injector([
      override(A).withValue({ foo: 'A' }),
    ]);
    const c = injector.get(C);
    const b = injector.get(B)
    const a = injector.get(A);

    expect(a.foo).toEqual('A');
    expect(b.bar).toEqual('bA');
    expect(c.bagel).toEqual('cAbA');

    expect(b.getA()).toBe(a);
    expect(c.injector).toBe(injector);
  })

  it('should throw if override loop exists', () => {
    const injector = new Injector([
      override(A).withOther(A2),
      override(A2).withOther(A3),
      override(A3).withOther(A),
    ]);
    expect(() => {
      injector.get(A);
    }).toThrowError(/^Circular override dependencies: A -> A2 -> A3 -> A$/);
  })
})
