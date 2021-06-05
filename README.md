# @drmercer/injector

![build status](https://github.com/drmercer/minimal-injector/actions/workflows/main.yml/badge.svg) ![npm (scoped)](https://img.shields.io/npm/v/@drmercer/injector?color=0aa)

A minimal, type-safe dependency injector written in TypeScript.

# What is Dependency Injection?

**_Dependency Injection_ (DI) is the practice of giving dependencies to software components from a central place that handles creating the dependencies, rather than having those components know how to create their dependencies themselves.**

_Component_ in this sense means any discrete part of software, not just UI components (as the term "component" is used in modern UI frameworks). Components are composed together to form an application. When using Dependency Injection, the _dependency injector_ (also called an _assembler_ or _DI container_ in some literature) does the composing. This happens from a single place at the root of the application, known as the _composition root_.

Dependency Injection provides Inversion of Control in the dependencies between components; instead of depending on a specific implementation of a dependency, a component simply depends on the interface, and the injector knows how to construct the appropriate component that satisfies that interface. This means components are less coupled together and can be more easily developed, tested, and reused independent of each other.

Often, because of Object Oriented Programming's popularity, Dependency Injection deals with components that are classes. However, this doesn't have to be the case, especially in a language like JavaScript/ECMAScript that isn't primarily class-based. Accordingly, this dependency injector deals with components that are arbitrary values by using factory functions instead of classes.

# How this injector works
To declare a component, use `injectable`. (I use the term "injectable" to mean "DI component", inspired somewhat by Angular's terminology.)

```ts
import {injectable} from '@drmercer/injector';

// TODO
```


## Example usage:

```ts
import {makeInjector} from '@drmercer/injector';

const Place = injectable<string>(() => 'world');

const Greeting = injectable<string>((inject) => `Hello, ${inject(Place)}!`);

const inject = makeInjector();

console.assert(inject(Greeting) === "Hello, world!");
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
