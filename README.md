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

* Be type-safe. No runtime errors that aren't compile-time errors.
* Be minimal. Anything nonessential is omitted.
* Be simple enough that you can understand it and then reimplement it yourself instead of adding another dependency to your `node_modules`. 🙃
