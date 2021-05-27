import { injectable, makeInjector } from '../../injector';

describe("class-based injectables", () => {

  class A {
    static key = injectable<A>(() => new A());
  }

  class B {
    static key = injectable<B>((inject) => new B(
      inject(A.key),
    ));

    constructor(public a: A) { }
  }

  it("should work", () => {
    const inject = makeInjector();

    const b = inject(B.key);
    const a = inject(A.key);
    expect(b.a).toBe(a);
  })
})
