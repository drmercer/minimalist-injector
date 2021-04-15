import { injectable, InjectKey, Injector, override } from './injector';

interface A {
  foo: string;
}

// The following 3 injectables all provide an implementation of the "A" interface

const A = injectable('A', (): A => {
  return {
    foo: 'a',
  };
});

const A2 = injectable('A2', (): A => {
  return {
    foo: 'a2',
  };
});

const A3 = injectable('A3', (): A => {
  return {
    foo: 'a3',
  };
});

// Using a named interface for an injectable is nice, but not necessary - here's an example where TS
// just infers the InjectKey's type from the factory function's return value:
const B = injectable('B', A, (a) => {
  function getA(): A {
    return a;
  }

  return {
    getA,
    bar: 'b' + a.foo,
  };
});

// This demonstrates how to express an optional dependency - just use a key that defaults to undefined, and
// then override it in the injector if needed
const OptionalA: InjectKey<A | undefined> = injectable('OptionalA', () => undefined);

// This demonstrates another advanced usage - injecting the injector. This allows C to do injection at
// runtime by calling injector.get().
const C = injectable('C', A, B, Injector.Self, OptionalA, (a: A, b, injector, maybeA?: A) => {
  return {
    bagel: 'c' + a.foo + b.bar,
    injector,
    hasOptionalA: maybeA !== undefined,
  };
});

// Type tests:

// Should only be able to override a key with a key/value assignable to it
new Injector([
  // @ts-expect-error Should reject because doesn't include `foo: string`
  override(A).withValue({ foo2: 'A' }),
]);

// @ts-expect-error Should properly type the InjectKey based on the return value of the factory fn
const BadReturnValue: InjectKey<{ a: boolean }> = injectable(
  'BadReturnValue',
  () => {
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
    expect(c.hasOptionalA).toBe(false);
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

  it('should allow overriding with key (optional dep, for demonstration)', () => {
    const injector = new Injector([
      override(OptionalA).withOther(A),
    ]);
    const c = injector.get(C);

    expect(c.hasOptionalA).toEqual(true);
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
