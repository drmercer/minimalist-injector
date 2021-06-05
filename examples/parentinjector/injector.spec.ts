import { injectable, makeInjector, override } from './injector';

const Place = injectable<string>(() => {
  return 'world'
});

const InternetPlace = injectable<string>(() => {
  return 'internet'
});

const Message = injectable<string>((inject) => {
  return 'hello ' + inject(Place);
});

const WholesomeMessage = injectable<string>((inject) => {
  return 'what a beautiful ' + inject(Place);
});

describe('injector with optional parent', () => {
  it('should work with no parent', () => {
    const get = makeInjector();

    expect(get(Message)).toBe('hello world');
  });

  it('should work with a parent', () => {

    const parentGet = makeInjector([
      override(Place, InternetPlace),
    ]);

    const get = makeInjector(
      [
        override(Message, WholesomeMessage),
      ],
      parentGet,
    );

    expect(parentGet(Message)).toBe('hello internet');
    expect(get(Message)).toBe('what a beautiful internet');
  });
})
