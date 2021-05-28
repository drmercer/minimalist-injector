# @drmercer/injector

![build status](https://github.com/drmercer/minimal-injector/actions/workflows/main.yml/badge.svg)

A minimal, type-safe dependency injector written in TypeScript.

## Example usage:

```ts
import {injectable, makeInjector} from '@drmercer/injector';

const Place = injectable<string>(() => 'world');

const Greeting = injectable<string>((inject) => `Hello, ${inject(Place)}!`);

const inject = makeInjector();

console.log(inject(Greeting)); // "Hello, world!"
```

See [`injector.spec.ts`](./injector.spec.ts) for more examples.

## Goals

* Be type-safe. Prefer compilation errors over runtime errors.
* Be minimal. Leave out any features that aren't essential.
* Be Deno-compatible. Deno is great. :heart:
* Be simple enough that you can understand it and then reimplement it yourself instead of adding another dependency to your `node_modules`. 🙃

## License

The _code_ in this project (e.g. all my TypeScript/JavaScript files and code snippets) is licensed under CC0. It's effectively public domain.

The English _text_ of this README and other Markdown files in this repo (minus the code snippets) are _not_ licensed and remain Copyright 2021 Dan Mercer, all rights reserved. (If you have questions about that, file your question as an issue on this repo and I'll try to respond promptly. I'm not trying to be a stickler, I just don't want someone plagiarizing my writing.)
