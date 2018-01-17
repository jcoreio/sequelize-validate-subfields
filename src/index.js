// @flow

import {ValidationError, ValidationErrorItem} from 'sequelize'

export type FieldValidation = {path: Array<string | number>, message: string}

export function validateSubfields<T>(validator: (value: T) => Iterable<FieldValidation>): (value: T) => void {
  return function validateSubfields(value: T) {
    const errors = [...validator(value)]
    if (errors.length) {
      const error = new Error('validation failed')
      ;(error: any).validation = {errors}
      throw error
    }
  }
}

type FlattenOptions = {
  formatItemMessage?: (item: ValidationErrorItem) => string,
}

function defaultFormatItemMessage(item: ValidationErrorItem): string {
  const {__raw} = (item: any)
  return __raw ? __raw.message : item.message
}

export function flattenValidationErrors(error: ValidationError, options?: FlattenOptions = {}): Array<FieldValidation> {
  const formatItemMessage = options.formatItemMessage || defaultFormatItemMessage
  const flattened: Array<FieldValidation> = []
  for (let item: ValidationErrorItem of error.errors) {
    const {path} = item
    const {__raw} = (item: any)
    const {validation} = __raw || {}
    const {errors} = validation || {}
    if (errors) {
      for (let {path: subpath, message} of errors) {
        flattened.push({path: [path, ...subpath], message})
      }
    } else {
      flattened.push({path: [path], message: formatItemMessage(item)})
    }
  }
  return flattened
}
