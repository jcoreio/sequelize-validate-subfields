// @flow

import { ValidationError, ValidationErrorItem } from 'sequelize'

export type FieldValidation = { path: Array<string | number>, message: string }

export function validateSubfields<T>(
  validator: (value: T) => Iterable<FieldValidation>
): (value: T) => void {
  return function validateSubfields(value: T) {
    const errors = [...validator(value)]
    if (errors.length) {
      const error = new Error('validation failed')
      ;(error: any).validation = { errors }
      throw error
    }
  }
}

type FlattenOptions = {
  formatItemMessage?: (item: ValidationErrorItem) => string,
}

function getOriginalError(item: ValidationErrorItem): Error | void {
  return (item: any).original || (item: any).__raw
}

function defaultFormatItemMessage(item: ValidationErrorItem): string {
  const original = getOriginalError(item)
  return original ? original.message : item.message
}

export function flattenValidationErrors(
  error: ValidationError,
  options?: FlattenOptions = {}
): Array<FieldValidation> {
  const formatItemMessage =
    options.formatItemMessage || defaultFormatItemMessage
  const flattened: Array<FieldValidation> = []
  for (let item: ValidationErrorItem of error.errors) {
    const { path } = item
    const errors = (getOriginalError(item): any)?.validation?.errors
    if (errors) {
      for (let { path: subpath, message } of errors) {
        flattened.push({ path: [path, ...subpath], message })
      }
    } else {
      flattened.push({ path: [path], message: formatItemMessage(item) })
    }
  }
  return flattened
}
