import { validateSubfields, flattenValidationErrors } from '../src'
import { expect } from 'chai'
import { ValidationError, ValidationErrorItem } from 'sequelize'

describe('validateSubfields', () => {
  it("doesn't throw when validation function yields no errors", () => {
    validateSubfields(function* noop() {})({
      min: 5,
      max: 2,
    })
  })
  it('throws correct error when validation function yields errors', () => {
    let errors
    try {
      validateSubfields(function* validateRange({ min, max }) {
        if (min >= max) {
          yield { path: ['min'], message: 'must be < max' }
          yield { path: ['max'], message: 'must be > min' }
        }
      })({
        min: 5,
        max: 2,
      })
    } catch (error) {
      expect(error.message).to.equal('validation failed')
      errors = error.validation.errors
    }
    expect(errors).to.deep.equal([
      { path: ['min'], message: 'must be < max' },
      { path: ['max'], message: 'must be > min' },
    ])
  })
})

describe('flattenValidationErrors', () => {
  it('works', () => {
    const doc = { range: { min: 5, max: 2 }, foo: 2, bar: 'baz' }
    const item0 = new ValidationErrorItem(
      'invalid range',
      'JSON',
      'range',
      doc.range
    )
    try {
      validateSubfields(function* validateRange({ min, max }) {
        if (min >= max) {
          yield { path: ['min'], message: 'must be < max' }
          yield { path: ['max'], message: 'must be > min' }
        }
      })(doc.range)
    } catch (error) {
      item0.__raw = error
    }
    const item1 = new ValidationErrorItem(
      'must be a string',
      'STRING',
      'foo',
      doc.foo
    )
    const item2 = new ValidationErrorItem(
      'must be a number',
      'DECIMAL',
      'bar',
      doc.bar
    )
    item2.__raw = new Error('test error message')
    const error = new ValidationError('validationFailed', [item0, item1, item2])

    expect(flattenValidationErrors(error)).to.deep.equal([
      { path: ['range', 'min'], message: 'must be < max' },
      { path: ['range', 'max'], message: 'must be > min' },
      { path: ['foo'], message: 'must be a string' },
      { path: ['bar'], message: 'test error message' },
    ])
  })
})
