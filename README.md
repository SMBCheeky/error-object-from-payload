[![License](https://img.shields.io/npm/l/@smbcheeky/error-object)](LICENSE_FILE)
[![deno.bundlejs.com](https://deno.bundlejs.com/badge?q=@smbcheeky/error-object-from-payload&treeshake=[*])](https://deno.bundlejs.com/?q=@smbcheeky/error-object-from-payload&treeshake=[*])
[![npm downloads](https://img.shields.io/npm/dm/@smbcheeky/error-object-from-payload)](https://www.npmjs.com/package/@smbcheeky/error-object-from-payload)
[![GitHub last commit](https://img.shields.io/github/last-commit/smbcheeky/error-object-from-payload)](https://github.com/smbcheeky/error-object-from-payload)
[![GitHub stars](https://img.shields.io/github/stars/smbcheeky/error-object-from-payload)](https://img.shields.io/github/stars/smbcheeky/error-object-from-payload)

# ErrorObjectFromPayload

Create [`ErrorObject`](https://github.com/SMBCheeky/error-object) instances from any payload — API responses, caught
exceptions, or unknown objects — using simple path-based rules. Get step-by-step debugging logs for the entire process.

## TL;DR

```bash
npm install @smbcheeky/error-object @smbcheeky/error-object-from-payload
```

```typescript
new ErrorObjectFromPayload(<any error-like payload>).debugLog('LOG');
// Use the debug output to understand what was found and adjust your options
```

Then check the [playground](https://github.com/SMBCheeky/error-object-from-payload/blob/main/playground/index.ts) for
detailed, step-by-step examples.

## Installation

```bash
npm install @smbcheeky/error-object @smbcheeky/error-object-from-payload
```

```bash
yarn add @smbcheeky/error-object @smbcheeky/error-object-from-payload
```

Both packages are required — `ErrorObjectFromPayload` extends `ErrorObject`.

## Why This Package?

[`ErrorObject`](https://github.com/SMBCheeky/error-object) gives you structured, chainable errors. But when you're
dealing with API responses, third-party payloads, or caught exceptions, you need a way to _extract_ an error from
messy, inconsistent data.

`ErrorObjectFromPayload` does that — you give it any object and a set of path-based rules, and it figures out the code,
message, details, and domain. When something doesn't map correctly, the debug output tells you exactly what was found,
where, and what went wrong.

## Quick Start

```typescript
import { ErrorObjectFromPayload } from '@smbcheeky/error-object-from-payload';

// Pass any error-like object — it just works with common patterns
new ErrorObjectFromPayload({
  error: { code: 'auth/invalid-email', message: 'The email address is badly formatted.' },
}).debugLog('LOG');

// [LOG] The email address is badly formatted. [auth/invalid-email]
// [DEBUG] { "code": "auth/invalid-email", "message": "The email address is badly formatted.", "raw": { ... } }
```

## How It Works

`ErrorObjectFromPayload` processes your input based on `ErrorObjectBuildOptions`:

1. **Input validation** — checks the input object using `checkInputObjectForValues`, `checkInputObjectForTypes`, and
   `checkInputObjectForKeys`. If a check fails, processing stops early.

2. **Error array detection** — looks for an array at `pathToErrors` (e.g. `['errors']`). If found, each element is
   processed separately and all other paths become relative to those elements.

3. **Value extraction** — resolves `pathToCode`, `pathToNumberCode`, `pathToMessage`, `pathToDetails`, and
   `pathToDomain` against each error object. String values are kept as-is; arrays and objects are `JSON.stringify`'d.

4. **Transform** — the optional `transform` function receives all extracted values and the source object, letting you
   remap codes to messages, derive domains, or apply any custom logic.

5. **Result** — the first valid error (with both `code` and `message`) becomes the `ErrorObjectFromPayload`. Additional
   errors are stored in `nextErrors`. The `raw` property contains `processingErrors`, `summary`, and the original input
   for debugging.

## Build Options

```typescript
new ErrorObjectFromPayload(payload, {
  // Pre-checks — skip processing if the input doesn't match
  checkInputObjectForValues: { status: { value: 'error', exists: true } },
  checkInputObjectForTypes: { data: { type: 'object', exists: true } },
  checkInputObjectForKeys: { error: { exists: true } },

  // Path to an array of errors (paths become relative to each element)
  pathToErrors: ['errors', 'errs'],

  // Paths to error properties (first match wins)
  pathToCode: ['code', 'error.code'],
  pathToNumberCode: ['numberCode'],
  pathToMessage: ['message', 'error.message'],
  pathToDetails: ['details', 'error.details'],
  pathToDomain: ['domain', 'type'],

  // Transform extracted values before creating the error
  transform: (beforeTransform, inputObject) => ({
    ...beforeTransform,
    message: beforeTransform.code === 'timeout' ? 'Request timed out.' : beforeTransform.message,
  }),
});
```

All paths support dot notation for nesting (e.g. `error.context.reason`) and numeric indices for arrays
(e.g. `errors.0.code`).

## Default Options

The library ships with sensible defaults that cover common API error patterns:

```typescript
{
  pathToErrors: ['errors', 'errs'],
  pathToCode: addPrefixPathVariants('error', ['code', 'err_code', 'errorCode', 'error_code']),
  pathToNumberCode: addPrefixPathVariants('error', ['numberCode', 'err_number_code', ...]),
  pathToMessage: addPrefixPathVariants('error', ['message', 'err_message', 'errorMessage', ...]),
  pathToDetails: addPrefixPathVariants('error', ['details', 'err_details', 'errorDetails', ...]),
  pathToDomain: addPrefixPathVariants('error', ['domain', 'errorDomain', 'type', ...]),
  transform: /* auto-converts numberCode to code string if code is missing */,
}
```

Use `addPrefixPathVariants('error', ['code'])` to generate `['code', 'error.code']` — handy when the error might be
nested or at the root.

## Logging

`ErrorObjectFromPayload` inherits all logging from `ErrorObject` and adds `verboseLog()`:

```typescript
error.log('TAG');        // toString() — message + code
error.debugLog('TAG');   // toDebugString() — includes full JSON with raw
error.verboseLog('TAG'); // toVerboseString() — debugLog + nextErrors (if any)
```

All methods return `this` for inline chaining.

## Multiple Errors

When `pathToErrors` finds an array with multiple entries, the first becomes the main error and the rest are stored in
`nextErrors`:

```typescript
const error = new ErrorObjectFromPayload(
  {
    error: {
      errors: [
        { code: 'auth/invalid-email', message: 'The email address is badly formatted.' },
        { code: 'auth/weak-password', message: 'The password is too weak.' },
      ],
    },
  },
  { pathToErrors: ['error.errors'] },
);

error.debugLog('AUTH');
// [AUTH][1] The email address is badly formatted. [auth/invalid-email]
// [DEBUG] { ... }
// [AUTH][2] The password is too weak. [auth/weak-password]
// [DEBUG] { ... }

error.nextErrors; // [ErrorObjectFromPayload { code: 'auth/weak-password', ... }]
```

## Debugging

When an error can't be built (missing code or message), `ErrorObjectFromPayload` returns a fallback error. Use
`.isFallback()` to check and `.debugLog()` to see what went wrong:

```typescript
const error = new ErrorObjectFromPayload(somePayload);

if (error.isFallback()) {
  error.debugLog('FALLBACK');
  // Check raw.processingErrors for what failed
  // Check raw.summary for what values were found at which paths
}
```

## Static Configuration

```typescript
// Show detailed console.log output during error building (default: true)
ErrorObjectFromPayload.SHOW_ERROR_LOGS = false;

// Show domain in toString() output (default: false, from ErrorObject 1.2.1)
ErrorObject.INCLUDE_DOMAIN_IN_STRING = true;

// Customize the log method
ErrorObject.LOG_METHOD = myLogger.error;

// Disable logging entirely
ErrorObject.LOG_METHOD = null;
```

## Examples

### Parse a REST API error

```typescript
new ErrorObjectFromPayload(JSON.parse(response.body), {
  pathToNumberCode: ['code'],
  pathToMessage: ['error'],
}).debugLog('API');

// [API] Invalid input data [400]
// [DEBUG] { "code": "400", "numberCode": 400, "message": "Invalid input data", "raw": { ... } }
```

### Map error codes to user-facing messages

```typescript
const createAuthError = (code: string) =>
  new ErrorObjectFromPayload(
    { code, domain: 'auth' },
    {
      transform: (state) => {
        const messages: Record<string, string> = {
          'generic': 'Something went wrong',
          'generic-again': 'Something went wrong. Please try again.',
          'generic-network': 'Please check your internet connection.',
        };
        return { ...state, message: messages[state.code ?? ''] ?? 'Something went wrong.' };
      },
    },
  );

createAuthError('generic').log('1');         // [1] Something went wrong [auth/generic]
createAuthError('generic-again').log('2');   // [2] Something went wrong. Please try again. [auth/generic-again]
createAuthError('generic-network').log('3'); // [3] Please check your internet connection. [auth/generic-network]
```

### Parse a GraphQL error response

```typescript
new ErrorObjectFromPayload(
  {
    errors: [
      {
        message: 'Cannot query field "username" on type "User"',
        locations: [{ line: 2, column: 3 }],
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
    ],
    data: null,
  },
  {
    pathToCode: ['extensions.code'],
    pathToMessage: ['message'],
    pathToDetails: ['locations'],
    checkInputObjectForValues: { data: { value: null, exists: true } },
  },
).debugLog('GQL');

// [GQL] Cannot query field "username" on type "User" [GRAPHQL_VALIDATION_FAILED]
// [DEBUG] { "code": "GRAPHQL_VALIDATION_FAILED", "message": "...", "details": "[{...}]", "raw": { ... } }
```

## FAQ

### Are paths absolute or relative?

Paths start as absolute (from the input root). If `pathToErrors` finds an array, all other paths become relative to each
element in that array. You can either set `pathToErrors` to `[]` and map from the root, or keep it and use relative
paths — the second approach is recommended as it handles multiple errors automatically.

### The error code is sometimes in `error.code` and sometimes at the root...

Use `addPrefixPathVariants('error', ['code'])` to generate `['code', 'error.code']` — the first match wins.

### Can I extract a raw value and process it later?

Yes. Use dot notation for any nesting depth (e.g. `error.details.0`). Non-string values are `JSON.stringify`'d. Use the
`transform` function to parse or reshape them. An `ErrorObject` needs at least `code` and `message` as strings.

### What's the difference between `ErrorObject` and `ErrorObjectFromPayload`?

Use `new ErrorObject(...)` when you know the code and message upfront. Use `new ErrorObjectFromPayload(...)` when you
need to extract them from an unknown payload. Both are `instanceof Error` and `instanceof ErrorObject`.

## More Examples

See the [playground](https://github.com/SMBCheeky/error-object-from-payload/blob/main/playground/index.ts) for 12
runnable examples covering GraphQL errors, REST APIs, nested payloads, validation errors, and more.
