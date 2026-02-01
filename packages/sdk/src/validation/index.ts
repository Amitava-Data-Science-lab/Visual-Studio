/**
 * Client-side validation utilities using AJV.
 */

import Ajv from 'ajv';
import { wizardSchema, pageSchema } from '@vsb/schemas';
import type { WizardDefinition, FieldDefinition } from '../types/wizard';
import type { PageDefinition } from '../types/page';
import type { Condition, SimpleCondition, CompoundCondition } from '../types/condition';
import { isSimpleCondition, isCompoundCondition } from '../types/condition';
import { getByPath } from '../jsonpath';

const ajv = new Ajv({ allErrors: true, verbose: true });

// Compile validators
const wizardValidator = ajv.compile(wizardSchema);
const pageValidator = ajv.compile(pageSchema);

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate a wizard definition against the schema.
 */
export function validateWizard(definition: unknown): ValidationResult {
  const valid = wizardValidator(definition);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (wizardValidator.errors || []).map((err) => ({
    path: err.instancePath || '/',
    message: err.message || 'Validation error',
  }));

  return { valid: false, errors };
}

/**
 * Validate a page definition against the schema.
 */
export function validatePage(definition: unknown): ValidationResult {
  const valid = pageValidator(definition);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (pageValidator.errors || []).map((err) => ({
    path: err.instancePath || '/',
    message: err.message || 'Validation error',
  }));

  return { valid: false, errors };
}

/**
 * Validate field value against field definition.
 */
export function validateFieldValue(
  field: FieldDefinition,
  value: unknown
): ValidationResult {
  const errors: ValidationError[] = [];

  // Required validation
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push({ path: field.id, message: `${field.label} is required` });
    return { valid: false, errors };
  }

  // Skip further validation if empty and not required
  if (value === undefined || value === null || value === '') {
    return { valid: true, errors: [] };
  }

  // Type-specific validation
  const validation = field.validation || {};

  switch (field.type) {
    case 'email':
      if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({ path: field.id, message: 'Invalid email address' });
      }
      break;

    case 'number':
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          errors.push({ path: field.id, message: `Must be at least ${validation.min}` });
        }
        if (validation.max !== undefined && value > validation.max) {
          errors.push({ path: field.id, message: `Must be at most ${validation.max}` });
        }
      }
      break;

    case 'text':
    case 'textarea':
      if (typeof value === 'string') {
        if (validation.minLength !== undefined && value.length < validation.minLength) {
          errors.push({
            path: field.id,
            message: `Must be at least ${validation.minLength} characters`,
          });
        }
        if (validation.maxLength !== undefined && value.length > validation.maxLength) {
          errors.push({
            path: field.id,
            message: `Must be at most ${validation.maxLength} characters`,
          });
        }
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              path: field.id,
              message: validation.patternMessage || 'Invalid format',
            });
          }
        }
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Evaluate a condition against form data.
 */
export function evaluateCondition(
  condition: Condition,
  data: Record<string, unknown>
): boolean {
  if (isCompoundCondition(condition)) {
    return evaluateCompoundCondition(condition, data);
  }

  if (isSimpleCondition(condition)) {
    return evaluateSimpleCondition(condition, data);
  }

  return false;
}

function evaluateSimpleCondition(
  condition: SimpleCondition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getByPath(data, condition.field);
  const compareValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === compareValue;
    case 'neq':
      return fieldValue !== compareValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue > compareValue
        : false;
    case 'gte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue >= compareValue
        : false;
    case 'lt':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue < compareValue
        : false;
    case 'lte':
      return typeof fieldValue === 'number' && typeof compareValue === 'number'
        ? fieldValue <= compareValue
        : false;
    case 'contains':
      return typeof fieldValue === 'string' && typeof compareValue === 'string'
        ? fieldValue.includes(compareValue)
        : false;
    case 'notContains':
      return typeof fieldValue === 'string' && typeof compareValue === 'string'
        ? !fieldValue.includes(compareValue)
        : true;
    case 'startsWith':
      return typeof fieldValue === 'string' && typeof compareValue === 'string'
        ? fieldValue.startsWith(compareValue)
        : false;
    case 'endsWith':
      return typeof fieldValue === 'string' && typeof compareValue === 'string'
        ? fieldValue.endsWith(compareValue)
        : false;
    case 'in':
      return Array.isArray(compareValue) ? compareValue.includes(fieldValue) : false;
    case 'notIn':
      return Array.isArray(compareValue) ? !compareValue.includes(fieldValue) : true;
    case 'empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    case 'notEmpty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    case 'matches':
      if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
        try {
          const regex = new RegExp(compareValue);
          return regex.test(fieldValue);
        } catch {
          return false;
        }
      }
      return false;
    default:
      return false;
  }
}

function evaluateCompoundCondition(
  condition: CompoundCondition,
  data: Record<string, unknown>
): boolean {
  const results = condition.conditions.map((c) => evaluateCondition(c, data));

  if (condition.logic === 'and') {
    return results.every((r) => r);
  }

  if (condition.logic === 'or') {
    return results.some((r) => r);
  }

  return false;
}
