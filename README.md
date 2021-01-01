# sequelize-validate-subfields

[![CircleCI](https://circleci.com/gh/jcoreio/sequelize-validate-subfields.svg?style=svg)](https://circleci.com/gh/jcoreio/sequelize-validate-subfields)
[![Coverage Status](https://codecov.io/gh/jcoreio/sequelize-validate-subfields/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/sequelize-validate-subfields)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![npm version](https://badge.fury.io/js/sequelize-validate-subfields.svg)](https://badge.fury.io/js/sequelize-validate-subfields)

simple framework for validating subfields of JSON attributes of Sequelize models

# Introduction

If you ever use JSON attributes in Sequelize models, you'll probably want to validate that the JSON matches some
schema. And if values within the JSON come from a form filled out by a user, you'll probably want to be able to
show validation errors from the server associated with the correct form field on the client.

But Sequelize `ValidationError`s be default only identify the top-level attribute of each validation error. For
example if you have the following validator:

```js
  address: {
    type: Sequelize.JSON,
    validate: {
      isValid(address) {
        if (/^\d{5}$/.test(address.postalCode)) throw new Error('invalid postal code')
      }
    }
  }
```

You'll get an error including the following information:

```js
ValidationError {
  errors: [
    ValidationErrorItem {
      message: 'invalid postal code',
      type: 'Validation error',
      path: 'address',
      __raw: Error {
        message: 'invalid postal code',
      },
      ...
    }
  ]
}
```

If you use this package to perform validation, you can tag each validation error with a specific field path instead:

```js
  address: {
    type: Sequelize.JSON,
    validate: {
      isValid: validateSubfields(function * (address) {
        if (/^\d{5}$/.test(address.postalCode)) yield {path: ['postalCode'], message: 'invalid postal code'}
        if (states.has(address.state)) yield {path: ['state'], message: 'invalid state'}
        // etc.
      })
    }
  }
```

And you'll get an error including those paths:

```
ValidationError {
  errors: [
    ValidationErrorItem {
      message: 'validation failed',
      type: 'Validation error',
      path: 'address',
      __raw: Error {
        message: 'validation failed',
        validation: {
          errors: [
            {path: ['postalCode'], message: 'invalid postal code'},
            {path: ['state'], message: 'invalid state'},
          ]
        }
      }
    }
  ]
}
```

This package also provides a `flattenValidationErrors` function to combine subfield validation errors like in the
example above with normal validation errors on non-JSON fields:

```js
;[
  { path: ['address', 'postalCode'], message: 'invalid postal code' },
  { path: ['address', 'state'], message: 'invalid state' },
]
```

# Installation

```sh
npm install --save sequelize-validate-subfields
```

# API

## `validateSubfields(validator)`

```js
const { validateSubfields } = require('sequelize-validate-subfields')
```

### Arguments

#### `validator: (value: any) => Iterable<FieldValidation>`

a generator function which receives the attribute `value` and may `yield` as many validation
`FieldValidation` objects as you wish, each specifying a validation error in the following form:

```js
{
  path: Array<string | number>,
  message: string,
}
```

`path` is the `lodash.get`-style path within the attribute (i.e. not including the attribute name itself) that
`message` is associated with. For example if you define an `address` attribute and validator on a model like this:

```js
  address: {
    type: Sequelize.JSON,
    validate: {
      isValid: validateSubfields(function * (address) {
        if (/^\d{5}$/.test(address.postalCode)) yield {path: ['postalCode'], message: 'invalid postal code'}
        if (states.has(address.state)) yield {path: ['state'], message: 'invalid state'}
        // etc.
      })
    }
  }
```

Notice that the yielded `path`s don't contain `'address'` (the name of the attribute) themselves; they must be relative
to the root of the attribute, instead of the root of the model instance.

### Returns: `(value: any) => void`

A Sequelize custom validator function that delegates to your `validator` function and combines any `FieldValidation`s
it `yield`ed into the appropriate thrown error.

## `flattenValidationErrors(error, [options])`

```js
const { flattenValidationErrors } = require('sequelize-validate-subfields')
```

### Arguments

#### `error: Sequelize.ValidationError`

A `ValidationError` hich may contain zero or more `ValidationErrorItems` -- some may be from non-JSON field
validation errors, and some may contain `FieldValidation`s from `validateSubfields`.

#### `options?: {formatItemMessage?: (item: ValidationErrorItem) => string}`

`formatItemMessage` allows you to override the error `message`s output for `ValidationErrorItem`s that don't
contain `FieldValidation`s using your own custom function.

### Returns: `Array<FieldValidation>`

A flattened array of `FieldValidation`s with `path`s relative to the root of the model instance instead of
being relative to specific attributes. For instance, if you have the following model:

```js
const User = sequelize.define('User', {
  username: {
    type: Sequelize.STRING,
    validate: {
      notEmpty: {
        msg: 'required',
      },
    },
  },
  address: {
    type: Sequelize.JSON,
    validate: {
      isValid: validateSubfields(function* (address) {
        if (/^\d{5}$/.test(address.postalCode))
          yield { path: ['postalCode'], message: 'invalid postal code' }
        if (states.has(address.state))
          yield { path: ['state'], message: 'invalid state' }
        // etc.
      }),
    },
  },
})
```

And you validate the following fields:

```js
{
  username: '',
  address: {
    postalCode: '123',
    state: 'KG',
  }
}
```

You will get a `ValidationError` with the following structure:

```
ValidationError {
  errors: [
    ValidationErrorItem {
      message: 'required',
      type: 'Validation error',
      path: 'username',
    },
    ValidationErrorItem {
      message: 'validation failed',
      type: 'Validation error',
      path: 'address',
      __raw: Error {
        message: 'validation failed',
        validation: {
          errors: [
            {path: ['postalCode'], message: 'invalid postal code'},
            {path: ['state'], message: 'invalid state'},
          ]
        }
      }
    }
  ]
}
```

Calling `flattenValidationErrors` on this will produce:

```js
;[
  { path: ['username'], message: 'required' },
  { path: ['address', 'postalCode'], message: 'invalid postal code' },
  { path: ['address', 'state'], message: 'invalid state' },
]
```
