import { injectable, InjectKey, makeInjector, override } from './injector';

interface A {
  foo: string;
}

// The following 3 injectables all provide an implementation of the "A" interface

const A = injectable<A>(() => {
  return {
    foo: 'a',
  };
});

const A2 = injectable<A>(() => {
  return {
    foo: 'a2',
  };
});

const A3 = injectable<A>(() => {
  return {
    foo: 'a3',
  };
});

// Using a named interface for an injectable is nice, but not necessary - here's an example where TS
// just infers the InjectKey's type from the factory function's return value:
const B = injectable((inject) => {
  const a = inject(A);
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
const OptionalA = injectable<A | undefined>(() => undefined);

const C = injectable((inject) => {
  const a = inject(A);
  const b = inject(B);
  const maybeA = inject(OptionalA);
  return {
    bagel: 'c' + a.foo + b.bar,
    hasOptionalA: maybeA !== undefined,
  };
});

// Type tests:

// @ts-expect-error Should only be able to override a key with a key/value assignable to it
override(A).with({ foo2: 'A' });

class C1 {
  private foo: undefined;
}
class C2 extends C1 {
  private bar: undefined;
}

const IC1 = injectable(() => new C1());
const IC2 = injectable(() => new C2());

// @ts-expect-error Should not allow a subtype to be overridden with a parent type
override(IC2).with(IC1);

// @ts-expect-error Should properly type the InjectKey based on the return value of the factory fn
const BadReturnValue: InjectKey<string> = injectable(() => 1337);

// Behavior tests:

describe('injector v2', () => {
  it('should work', () => {
    const inject = makeInjector();
    const c = inject(C);
    const b = inject(B)
    const a = inject(A);

    expect(b.bar).toEqual('ba');
    expect(c.bagel).toEqual('caba');

    expect(b.getA()).toBe(a);
    expect(c.hasOptionalA).toBe(false);
  })

  it('should allow overriding with key', () => {
    const inject = makeInjector([
      override(A).with(A2),
    ]);
    const c = inject(C);
    const b = inject(B)
    const a = inject(A);

    expect(a.foo).toEqual('a2');
    expect(b.bar).toEqual('ba2');
    expect(c.bagel).toEqual('ca2ba2');

    expect(b.getA()).toBe(a);
  })

  it('should allow overriding with key (optional dep, for demonstration)', () => {
    const inject = makeInjector([
      override(OptionalA).with(A),
    ]);
    const c = inject(C);

    expect(c.hasOptionalA).toEqual(true);
  })

  it('should allow overriding with value', () => {
    const inject = makeInjector([
      override(A).with(injectable(() => ({ foo: 'A' }))),
    ]);
    const c = inject(C);
    const b = inject(B)
    const a = inject(A);

    expect(a.foo).toEqual('A');
    expect(b.bar).toEqual('bA');
    expect(c.bagel).toEqual('cAbA');

    expect(b.getA()).toBe(a);
  })
})
