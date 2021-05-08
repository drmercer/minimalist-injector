import { injectable, injectablesByName, makeInjector } from './injector';

interface A {
  foo: string;
}

const A = injectable('A', (): A => {
  return {
    foo: 'a',
  };
});

const B = injectable('B', (inject) => {
  const a = inject(A);

  return {
    bar: 'b' + a.foo,
  };
});

describe('named injector', () => {
  it('should apply named niceties', () => {
    const [inject] = makeInjector();
    const b = inject(B)
    const a = inject(A);

    expect(a + '').toBe('[object A]');

    const byName = inject(injectablesByName);
    expect(byName.A).toEqual(a);
    expect(byName.B).toEqual(b);
  })
})
