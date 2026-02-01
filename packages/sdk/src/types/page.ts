/**
 * Page type definitions matching the JSON schema.
 */

import type { Condition } from './condition';
import type { FieldDefinition } from './wizard';

export interface PageDefinition {
  id?: string;
  name?: string;
  description?: string;
  layout?: PageLayout;
  fields?: PageFieldDefinition[];
  sections?: SectionDefinition[];
  validation?: PageValidation;
}

export interface PageLayout {
  type?: 'single-column' | 'two-column' | 'grid';
  columns?: number;
  gap?: string;
}

export interface PageFieldDefinition extends FieldDefinition {
  disabled?: boolean;
  readOnly?: boolean;
  layout?: FieldLayout;
}

export interface FieldLayout {
  column?: number;
  span?: number;
  width?: string;
}

export interface SectionDefinition {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields?: string[];
  conditions?: Condition[];
}

export interface PageValidation {
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  rules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'custom' | 'crossField';
  fields?: string[];
  message?: string;
  expression?: string;
}
