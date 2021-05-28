import { InjectableClass, makeInjector } from './injector';

@InjectableClass
class A {
  public foo = 'bagel';
}

@InjectableClass
class B {
  constructor(public a: A) { }

  public bar = 'potato'
}

describe("decorator-based dependency injection", () => {
  it("should work", () => {
    const inject = makeInjector();

    const a = inject(A);
    const b = inject(B);

    expect(a).toBeInstanceOf(A);
    expect(b).toBeInstanceOf(B);
    expect(b.a).toBe(a);
  })

  it("should throw at 'declaration time' if a class depends on something that's not injectable", () => {
    expect(() => {
      @InjectableClass
      class Foo {
        constructor(public badDependency: Object) { }
      }
    }).toThrow('Object is not an InjectableClass!');
  })
})
