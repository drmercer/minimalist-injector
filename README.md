# @drmercer/injector

![build status](https://github.com/drmercer/minimal-injector/actions/workflows/main.yml/badge.svg) ![npm (scoped)](https://img.shields.io/npm/v/@drmercer/injector?color=0aa) [![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/raw.githubusercontent.com/drmercer/minimal-injector/master/injector.ts)

A minimal, type-safe dependency injector written in TypeScript.

# What is Dependency Injection?

**_Dependency Injection_ (DI) is the practice of giving dependencies to software components from a central place that handles creating the dependencies, rather than having those components know how to create their dependencies themselves.**

_Component_ in this sense means any discrete part of software, not just UI components (as the term "component" is used in modern UI frameworks). Components are composed together to form an application. When using Dependency Injection, components are composed together by a single place at the root of the application, known as the _composition root_. This can be done manually, but often a _dependency injector_ (also called an _assembler_ or _DI container_ in some literature) does the composing automatically.

Dependency Injection provides Inversion of Control in the dependencies between components; instead of depending on a specific implementation of a dependency, a component simply depends on the interface, and the injector knows how to construct the appropriate component that satisfies that interface. This means components are less coupled together and can be more easily developed, tested, and reused independent of each other.

Often, because of Object Oriented Programming's popularity, Dependency Injection deals with components that are classes. However, this doesn't have to be the case, especially in a language like JavaScript/ECMAScript that isn't primarily class-based. Accordingly, this dependency injector deals with components that are arbitrary values by using factory functions instead of classes.

Let's look at an example of what dependency injection looks like compared to using regular dependencies. Here are some components that depend on each other directly, without using any dependency inversion:

```ts
function getGreetingSubject(): string {
  return "world";
}

function getGreeting(): string {
  return `Hello ${getGreetingSubject()}!`;
}

function getGreeter(): () => void {
  return () => {
    console.log(getGreeting());
  };
}

// application root:
const greeter = getGreeter();
greeter(); // logs 'Hello world!'
```

This works, but it has some downsides - what if we want to use `getGreeting` with a different subject? The _tight coupling_ between `getGreeting` and `getGreetingSubject` makes that impossible to do without changing the implementation.

Here's how we could invert the control of dependencies by doing manual dependency injection:

```ts
function getGreetingSubject(): string {
  return "world";
}

function getGreeting(subject: string): string {
  return `Hello ${subject}!`;
}

function getGreeter(greeting: string): () => void {
  return () => {
    console.log(greeting);
  };
}

// application root - now also the composition root
const subject = getGreetingSubject();
const greeting = getGreeting(subject);
const greeter = getGreeter(greeting);
greeter(); // logs 'Hello world!'
```

The components are less coupled to their dependencies now. For example, we can easily replace the subject used in the greeting by replacing `const subject = getGreetingSubject()` with `const subject = 'there'` to produce a [more civilized](https://youtu.be/eaEMSKzqGAg) greeting. However, notice the increasing complexity of the composition root, even for this small example. This complexity brings some downsides:

* All components have to be created up front, which could cause slow startup time if they are really big or involve expensive operations.
* All components are directly depended on by the composition root, which makes code splitting more difficult - all those dependencies will need to be included in the composition root's bundle.
* It's hard to see what dependencies are meaningfully overridden as opposed to just using sensible defaults.
* It becomes a headache when you have components being shared between multiple applications, because you have to maintain multiple composition roots.

In short, the compostion root is now coupled to every component used in the application. Wouldn't it be nice if we could only couple it to components that it really cares about (such as the customized greeting), and leave the default dependencies untouched?

A _dependency injector_ can help us here, by wiring together dependencies automatically. Read on to find out what that could look like.

# Designing a minimal, type-safe dependency injector

(If you're not interested in this part and you're okay with spoilers, you can skip ahead to [Example usage](#example-usage).)

**First, we know we need some kind of runtime value to represent a dependency on a certain component.** This will tell the injector what component to return. In a class-based injector like Angular's this is often accomplished using a class, which is both a type and a value. Angular, Vue, and other systems also allow you to use a different kind of key, such as a string or symbol (in Vue), if you want to provide an arbitrary value that's not necessarily an instance of a class. For minimalism, we want to avoid having multiple kinds of key, so we'll just use our own kind of value and not do the class approach.

We'll figure out what the value actually _is_ later; at this point, we just know our injection key type will look something like this (where `T` is the type of the injected value).

```ts
export type InjectKey<T>
```

(Note: `InjectKey<T>` should be covariant with `T` (meaning if `Y` is assignable to `X`, then `InjectKey<Y>` should be assignable to `InjectKey<X>`). TypeScript determines variance automatically based on the structure of the type, so we'll keep that in mind when defining the implementation of `InjectKey`.)

To put this `InjectKey` type in context, our injector will have some kind of way to get the value for a given key - something like this:

```ts
function get<T>(key: InjectKey<T>): T
```

Next, as mentioned before, **we'll use factory functions for actually creating our components** (like the `getGreeter` function we saw before). This give us maximum flexibility, because a factory function can return anything, even another function.

Next is the first design decision that's not strictly necessary - every `InjectKey` should have a default value for the component associated with it. In practice, this means every `InjectKey` should have a default factory function.

At this point, we can start defining what it might look like to declare a component:

```ts
const Greeter: InjectKey<() => void> = injectable(getGreeter);
```

`Greeter` is the injection key, and `getGreeter` is the default factory function used to get the component for that key. (I use `UpperCamelCase` for injection keys, to differentiate them from other values, similar to why class constructors are typically named that way.)

Now the hard part. How does the injector know what dependencies to provide to `getGreeter`? One solution would be to pass a list of dependencies to `injectable`:


```ts
const GreetingSubject: InjectKey<string> = injectable([], getGreetingSubject);

const Greeting: InjectKey<string> = injectable([GreetingSubject], getGreeting)

const Greeter: InjectKey<() => void> = injectable([Greeting], getGreeter);
```

This is a very good solution that is simple, flexible, and intuitive, and there's a way to make it type-safe, which is also important and valuable. We'll make a simplification to it later on, but let's stick with this for now and think about what the injector itself (the part used at the composition root) would look like.

Based on what we know so far, the injector needs these features:
* A function that can be called to get (and create, if needed) the component corresponding to a key.
* A way to provide an override for a key, to make it use a different factory function than the default.

Why not make it so the injector _is_ the function mentioned in #1, and the injector-factory takes a `Map`-like list of tuples to specify overrides for #2? Here's what that could look like:

```ts
type Injector = <T>(key: InjectKey<T>) => T;

const get: Injector = makeInjector([
  [KeyToOverride, KeyToUseInstead]
]);
```

That's nice and simple. Let's apply that solution to our previous example of overriding the greeting subject.

```ts
const GreetingSubject: InjectKey<string> = injectable([], getGreetingSubject);

const Greeting: InjectKey<string> = injectable([GreetingSubject], getGreeting)

const Greeter: InjectKey<() => void> = injectable([Greeting], getGreeter);

const CivilizedGreetingSubject: InjectKey<string> = injectable([], () => 'there');

const get = makeInjector([
  [GreetingSubject, CivilizedGreetingSubject]
]);

const greeter = get(Greeter);
greeter(); // logs 'Hello there!'
```

Perfect! However, there are some things this injector can't do yet. For example, all dependencies are constructed at startup still - in order to do code-splitting or lazy dependencies, we'll need a way to inject the injector itself into a component. We can do that by using a special `InjectKey` to represent the injector. For example, let's say we wanted to only construct the greeting when `greeter` is actually called, not when it's constructed. Here's what that might look like:

```ts
const InjectorKey: InjectKey<Injector> = ...;

const GreetingSubject: InjectKey<string> = injectable([], getGreetingSubject);

const Greeting: InjectKey<string> = injectable([GreetingSubject], getGreeting)

// Note: we're now listing InjectorKey in the deps list, instead of Greeting
const Greeter: InjectKey<() => void> = injectable([InjectorKey], (get: Injector) => {
  return () => {
    console.log(get(Greeting));
  };
});

const CivilizedGreetingSubject: InjectKey<string> = injectable([], () => 'there');

const get = makeInjector([
  [GreetingSubject, CivilizedGreetingSubject]
]);

const greeter = get(Greeter);
// (Note: the greeting hasn't been built yet!)

greeter(); // logs 'Hello there!'
// (now the greeting has been built)
```

That's pretty cool. But there's a simplification we can do here (and we're in pursuit of a _minimal_ dependency injector, so we press onward!). In the above example, there are two ways for a component to express a dependency on another:

1. listing the other's key in the deps list, or
2. passing the other's key to an injected Injector.

Stare at that list long enough, and you'll realize that #1 could actually be implemented using #2. (I'll show you how [later in this article](#deps-list).) Solution 2 is the simpler solution for how to express dependencies. So, in our aggressive pursuit of simplicity, let's scrap the deps list entirely, and just pass the injector to each factory function.

```ts
const GreetingSubject: InjectKey<string> = injectable(getGreetingSubject);

const Greeting: InjectKey<string> = injectable(inject => getGreeting(inject(GreetingSubject)));

const Greeter: InjectKey<() => void> = injectable(inject => {
  return () => {
    console.log(inject(Greeting));
  };
});

const CivilizedGreetingSubject: InjectKey<string> = injectable(() => 'there');

const get = makeInjector([
  [GreetingSubject, CivilizedGreetingSubject]
]);

const greeter = get(Greeter);
greeter(); // logs 'Hello there!'
```

The minimalist code-artist in me is happy. That's both simple and elegant! A few last things: first, we can remove the explicit `InjectKey` types, since TypeScript infers types automatically. Second, because type safety is slightly more important than minimalism, let's make sure overriding keys are assignable to the keys they override. We can do that by using this function:

```ts
function override<T extends InjectKey<unknown>, U extends T>(overridden: T, overrider: U): [T, U] {
  return [overridden, overrider];
}
```

Here's what our final iteration looks like in our greeting example!

```ts
const GreetingSubject = injectable(getGreetingSubject);

const Greeting = injectable(inject => getGreeting(inject(GreetingSubject)));

const Greeter = injectable(inject => {
  return () => {
    console.log(inject(Greeting));
  };
});

const CivilizedGreetingSubject = injectable(() => 'there');

const get = makeInjector([
  override(GreetingSubject, CivilizedGreetingSubject),
]);

const greeter = get(Greeter);
greeter(); // logs 'Hello there!'
```

# Implementation

The full implementation can be found in [`injector.ts`](./injector.ts). The types are the most important part, shown below:

```ts
interface InjectKey<T> {
  // this makes InjectKey covariant with T, and provides access to the factory for advanced usage
  _create: (inject: Injector) => T;
}

declare type Injector = <T>(key: InjectKey<T>) => T;

declare function injectable<T>(factory: (inject: Injector) => T): InjectKey<T>;

declare type Override<A, B extends A> = [overridden: InjectKey<A>, overrider: InjectKey<B>];

// The utility function for type safety we defined earlier
declare function override<A, B extends A>(a: InjectKey<A>, b: InjectKey<B>): Override<A, B>;

declare function makeInjector(overrides?: Override<unknown, unknown>[]): Injector;

```

# Example usage
To declare a component, use `injectable`. (I use the term "injectable" to mean "DI component", inspired somewhat by Angular's terminology.)

To create an injector, use `makeInjector`.

```ts
import {injectable, makeInjector} from '@drmercer/injector';

const GreetingSubject = injectable<string>(() => 'world');

const Greeting = injectable<string>(inject => `Hello ${inject(GreetingSubject)}!`);

const get = makeInjector([
  override(GreetingSubject, injectable(() => 'there')),
]);

console.assert(get(Greeting) === "Hello there!");
```

Documentation can be found at
[doc.deno.land](https://doc.deno.land/https/raw.githubusercontent.com/drmercer/minimal-injector/master/injector.ts),
and you can check [`injector.spec.ts`](./injector.spec.ts) for more examples of basic usage.

# Advanced usage

## Optional dependencies

Optional dependencies can be expressed in the regular TypeScript way - by just including `undefined` in the injected type! No special treatment needed!

```ts
const OptionalDep = injectable<Object|undefined>(() => undefined);
```

You could even make an `optionalInjectable` utility if you find yourself making optional dependencies a lot.

```ts
const optionalInjectable = <T>() => injectable<T|undefined>(() => undefined);

const OptionalDep = optionalInjectable<Object>();
```

## Aliasing the inferred type of the injected value

If you want a way to refer to the _type_ of an injectable without explicitly specifying that type, you can use the `InjectedValue` helper type. This is useful for injectables that are more complex. You can even name the resulting type alias the same as the injectable it corresponds to, since TypeScript types and variables are not ambiguous with each other, so the names don't collide.

```ts
import {injectable, InjectedValue} from '@drmercer/injector';

type Dep = InjectedValue<typeof Dep>; // equivalent to type `{ foo(): void; bar(): void }`

const Dep = injectable(() => {
  return {
    foo() {
      console.log("foo");
    },
    bar() {
      console.log("bar");
    }
  };
});
```

## Specifying the interface separately

On the other hand, sometimes you want to explicitly specify the interface separately from the injectable that implements it. You can do that easily:

```ts
interface Dep {
  foo(): void;
  bar(): void;
}

const Dep = injectable<Dep>(() => {
  return {
    foo() {
      console.log("foo");
    },
    bar() {
      console.log("bar");
    }
  };
});
```

## Class-based injectables

You can create class-based injectables out-of-the-box by defining static `InjectKey` property on each class, and then referencing that property to inject it in other classes.

```ts
class A {
  static key = injectable<A>(() => new A());
}

class B {
  static key = injectable<B>((inject) => new B(
    inject(A.key),
  ));

  constructor(public a: A) { }
}
```

## Deps list

If you prefer to list your dependencies up-front, you can make a higher-order function to do that:

```ts
import {InjectKey, InjectedValue} from '@drmercer/injector';

type InjectKeyValues<KeyList extends InjectKey<unknown>[]> = {
  [K in keyof KeyList]: KeyList[K] extends InjectKey<unknown> ? InjectedValue<KeyList[K]> : never;
}

function withDeps<T, InjectKeys extends InjectKey<unknown>[]>(depKeys: InjectKeys, f: (...deps: InjectKeyValues<InjectKeys>) => T) {
  return (inject: Injector): T => {
    const fulfilledDeps = depKeys.map(inject) as any;
    return f(...fulfilledDeps);
  };
}
```

Side note: it's unfortunate we have to use a type assertion (`as any`) here, but I haven't found a way around it. I think it would require TypeScript to support higher-order types (types of types). Let me know if you know a way to do it.

Here's what it would look like to use that with the example from earlier:

```ts
const GreetingSubject: InjectKey<string> = injectable(getGreetingSubject);

const Greeting: InjectKey<string> = injectable(withDeps([GreetingSubject], getGreeting))

const Greeter: InjectKey<() => void> = injectable(withDeps([Greeting], getGreeter));

const CivilizedGreetingSubject: InjectKey<string> = injectable(() => 'there');

const get = makeInjector([
  override(GreetingSubject, CivilizedGreetingSubject),
]);

const greeter = get(Greeter);
greeter(); // logs 'Hello there!'
```

# Project Goals

* Be type-safe. Prefer compilation errors over runtime errors.
* Be minimal. Leave out any features that aren't essential.
* Be Deno-compatible. Deno is great. :heart:
* Be simple enough that you can understand it and then reimplement it yourself instead of adding another dependency to your `node_modules`. 🙃

# License

The _code_ in this project (e.g. all my TypeScript/JavaScript files and code snippets) is licensed under CC0. It's effectively public domain.

The English _text_ of this README and other Markdown files in this repo (minus the code snippets) are _not_ licensed and remain Copyright 2021 Dan Mercer, all rights reserved.
