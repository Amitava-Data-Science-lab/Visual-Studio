/**
 * Wizard type definitions matching the JSON schema.
 */

import type { Condition } from './condition';

export interface WizardDefinition {
  name?: string;
  description?: string;
  version?: string;
  steps: StepDefinition[];
  hooks?: WizardHooks;
  settings?: WizardSettings;
}

export interface StepDefinition {
  id: string;
  title: string;
  description?: string;
  pageRef?: string;
  fields?: FieldDefinition[];
  conditions?: Condition[];
  hooks?: StepHooks;
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: unknown;
  options?: FieldOption[];
  validation?: FieldValidation;
  conditions?: Condition[];
  // Additional type-specific properties
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  rows?: number;
}

export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'date'
  | 'radio'
  | 'file';

export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface WizardHooks {
  onStart?: Hook;
  onComplete?: Hook;
  onStepChange?: Hook;
}

export interface StepHooks {
  onEnter?: Hook;
  onLeave?: Hook;
  onValidate?: Hook;
}

export interface Hook {
  type: 'api' | 'compute';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  expression?: string;
}

export interface WizardSettings {
  allowBack?: boolean;
  showProgress?: boolean;
  showStepNumbers?: boolean;
}
