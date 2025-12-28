[![License](https://img.shields.io/npm/l/@smbcheeky/error-object)](LICENSE_FILE)
[![deno.bundlejs.com](https://deno.bundlejs.com/badge?q=@smbcheeky/error-object-from-payload&treeshake=[*])](https://deno.bundlejs.com/?q=@smbcheeky/error-object-from-payload&treeshake=[*])
[![npm downloads](https://img.shields.io/npm/dm/@smbcheeky/error-object-from-payload)](https://www.npmjs.com/package/@smbcheeky/error-object-from-payload)
[![GitHub last commit](https://img.shields.io/github/last-commit/smbcheeky/error-object-from-payload)](https://github.com/smbcheeky/error-object-from-payload)
[![GitHub stars](https://img.shields.io/github/stars/smbcheeky/error-object-from-payload)](https://img.shields.io/github/stars/smbcheeky/error-object-from-payload)

## TL;DR

- Install the package `npm install @smbcheeky/error-object @smbcheeky/error-object-from-payload`
- Write `fromPayload(<pick an api response with an error>).force.verboseLog('LOG')` and use the info provided to
  map your error
- Switch the .force with .error, and now you have an error object
- :tada:
- oh... and check the [playground](https://github.com/SMBCheeky/error-object-from-payload/blob/main/playground/index.ts)
  file

## Installation

`npm install @smbcheeky/error-object @smbcheeky/error-object-from-payload`

`yarn add @smbcheeky/error-object @smbcheeky/error-object-from-payload`

## Description

The ErrorObject class is made to extend `Error` enabling checks like `errorObject instanceof Error` or
`errorObject instanceof ErrorObject`. The `ErrorObject` class is backwards compatible with `Error`.

This functionality was extracted from the [error-object](https://github.com/SMBCheeky/error-object) package (at v1.1.5)
and renamed to `error-object-from-payload` to simplify the main package and its README. This package is not a
replacement for the `error-object` package, it is just a helper to simplify the process of creating errors from any
payload by providing step-by-step debugging logs for the entire process.

## Usage

Use `fromPayload(<anything>)` to create errors from any input:

- you can pass an object or a caught error to it, and it will try its best to create an error from it
- `fromPayload(<anything>)` returns an object with two properties: `.error` and `.force`
- `.error` represents the error, if it can be created, otherwise it is `undefined`
- `.force` represents the error, if it can be created, otherwise it is going to return a `ErrorObject.fallback()`
  error

The processing of the ErrorObject is done in a few steps, based on the `ErrorObjectBuildOptions`:

- first the initial object is checked via the options `checkInputObjectForValues` and `checkInputObjectForTypes` and
  `checkInputObjectForKeys`
- then the objects checks for an object array at `pathToErrors`, which could be an array of errors
- if an error array is found, the process will consider all other paths relative to the objects in the error array found
- if an error array is not found, the process will consider all other paths absolute to the initial objectpassed to
  `fromPayload()`
- the `pathToCode`, `pathToNumberCode`, `pathToMessage`, `pathToDetails` and `pathToDomain` options are used to map
  values to their associated field, if found
- for all fields other than `numberCode`, if a value is found and is a string, it is saved as is, but if it is an array
  or an object it will be JSON.stringify'ed and saved as a string
- for `numberCode`, if a value is found and it is a number different than `NaN`, it is saved
- the `transform` function is used to transform the found values by the parsing process into the error object
- the transform function has access to all pre-transformation values and also the initial object (object inside the
  errors array or initial object)
- everything gets processed into a list of `ErrorSummary | ErrorObjectErrorResult` array
- it contains everything, from error strings custom-made to be as distinct and easy to read as possible, to self
  documenting summaries of what values are found, at which path, if an errors object was found, etc.
- the count of the list is meant to be an indication of how many input objects were found and processed, as each of them
  should become an error object
- in the last step of the process, the list is filtered down and a single error object is created, with everything baked
  in
- think detailed `processingErrors` which includes the summaries and the errors that were triggered during the process,
  the `raw` object that was used as in input for the fromPayload() call and the `nextErrors` array which allows for
  all errors to be saved on one single error object for later use

## Usage & Examples

For a guide on how to use the library, please check the first detailed example in
the [playground](https://github.com/SMBCheeky/error-object/blob/main/playground/index.ts) file.

```typescript
new ErrorObject({ code: '', message: 'Something went wrong.', domain: 'auth' }).debugLog('LOG');

fromPayload({ code: '', message: 'Something went wrong', domain: 'auth' })?.force?.debugLog('LOG');

// Example 12 output:
// 
// [LOG] Something went wrong. [auth]
// {
//   "code": "",
//   "message": "Something went wrong.",
//   "domain": "auth"
// }
// 
// [LOG] Something went wrong [auth]
// {
//   "code": "",
//   "message": "Something went wrong",
//   "domain": "auth"
// }
```

```typescript
const response = {
  statusCode: 400,
  headers: {
    'Content-Type': 'application/json',
  },
  body: '{"error":"Invalid input data","code":400}',
};

fromPayload(JSON.parse(response?.body), {
  pathToNumberCode: ['code'],
  pathToMessage: ['error'],
}).force?.debugLog('LOG');

// Example 6 output:
//
// [LOG] Invalid input data [400]
// {
//   "code": "400",
//   "numberCode": 400,
//   "message": "Invalid input data"
// }
```

```typescript
/* 
 * You could have a file called `errors.ts` in each of your modules/folders and 
 * define a function like `createAuthError2()` that returns an error object with 
 * the correct message and domain.
 */
const AuthMessageResolver = (
  beforeTransform: ErrorObjectTransformState): ErrorObjectTransformState => {
  // Quick tip: Make all messages slightly different, to make it easy
  // to find the right one when debugging, even in production
  let message: string | undefined;
  switch (beforeTransform.code) {
    case 'generic':
      message = 'Something went wrong';
      break;
    case 'generic-again':
      message = 'Something went wrong. Please try again.';
      break;
    case 'generic-network':
      message = 'Something went wrong. Please check your internet connection and try again.';
      break;
    default:
      message = 'Something went wrong.';
  }
  return { ...beforeTransform, message };
};

const createAuthError2 = (code: string) => {
  return fromPayload({ code, domain: 'auth', }, { transform: AuthMessageResolver, });
};


createAuthError2('generic')?.error?.log('1');
createAuthError2('generic-again')?.error?.log('2');
createAuthError2('generic-network')?.error?.log('3');
createAuthError2('invalid-code')?.error?.log('4');

// Example 2 output:
//
// [1] Something went wrong [auth/generic]
// [2] Something went wrong. Please try again. [auth/generic-again]
// [3] Something went wrong. Please check your internet connection and try again. [auth/generic-network]
// [4] Something went wrong. [auth/invalid-code]
```

## FAQ

### How do I use paths? Are they absolute?

To support inputs containing arrays of errors as well as single errors, all paths are treated initially as absolute (
from the
input root), but if an array of errors is detected, it will consider each element found the new root input object. Devs
have a
choice: set the "pathToErrors" option as empty, and then map only the first error (highly not recommended), or adjust
the paths to be relative to the objects inside the detected errors array.

### How do I use paths? I sometimes get the error code in an `error` object, and sometimes in the root object...

You can use `pathToCode: addPrefixPathVariants('error', ['code']),` or `pathToCode: ['error.code']`

### How do I use paths? Can I get the raw contents of a path and process it later?

Yes, you can. You can use paths like `error.details.0` to get a raw value, and then process it later using the
`transform` option.
If the value is not a string, it will be converted to a string using `JSON.stringify` to ensure everything works as
intended.
Remember, for an ErrorObject to be created, it needs at least a code and a message, and both are required to be string
values.
