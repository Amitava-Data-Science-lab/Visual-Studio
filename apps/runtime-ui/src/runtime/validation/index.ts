import type { Field } from '@/api/runtimeApi';

// Extended field type with validation props
interface FieldWithValidation extends Field {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateField(
  field: FieldWithValidation,
  value: unknown
): ValidationResult {
  const errors: string[] = [];

  // Required validation
  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push(`${field.label} is required`);
  }

  // Type-specific validation
  if (value !== undefined && value !== null && value !== '') {
    switch (field.type) {
      case 'email':
        if (typeof value === 'string' && !isValidEmail(value)) {
          errors.push('Please enter a valid email address');
        }
        break;

      case 'number':
        if (typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors.push(`Value must be at least ${field.min}`);
          }
          if (field.max !== undefined && value > field.max) {
            errors.push(`Value must be at most ${field.max}`);
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (typeof value === 'string') {
          if (field.minLength !== undefined && value.length < field.minLength) {
            errors.push(`Must be at least ${field.minLength} characters`);
          }
          if (field.maxLength !== undefined && value.length > field.maxLength) {
            errors.push(`Must be at most ${field.maxLength} characters`);
          }
          if (field.pattern) {
            const regex = new RegExp(field.pattern);
            if (!regex.test(value)) {
              errors.push(field.patternMessage || 'Invalid format');
            }
          }
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateStep(
  fields: FieldWithValidation[],
  formData: Record<string, unknown>
): ValidationResult {
  const allErrors: string[] = [];

  for (const field of fields) {
    const result = validateField(field, formData[field.id]);
    allErrors.push(...result.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
