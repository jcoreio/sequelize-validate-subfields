import { ValidationError, ValidationErrorItem } from 'sequelize'

export type FieldValidation = { path: Array<string | number>; message: string }

export function validateSubfields<T>(
  validator: (value: T) => Iterable<FieldValidation>
): (value: T) => void

type FlattenOptions = {
  formatItemMessage?: (item: ValidationErrorItem) => string
}

export function flattenValidationErrors(
  error: ValidationError,
  options?: FlattenOptions = {}
): Array<FieldValidation>
