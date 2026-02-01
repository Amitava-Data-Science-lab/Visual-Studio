/**
 * Condition type definitions matching the JSON schema.
 */

export type Condition = SimpleCondition | CompoundCondition;

export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface CompoundCondition {
  logic: 'and' | 'or';
  conditions: Condition[];
}

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'empty'
  | 'notEmpty'
  | 'matches';

/**
 * Type guard for SimpleCondition
 */
export function isSimpleCondition(condition: Condition): condition is SimpleCondition {
  return 'field' in condition && 'operator' in condition;
}

/**
 * Type guard for CompoundCondition
 */
export function isCompoundCondition(condition: Condition): condition is CompoundCondition {
  return 'logic' in condition && 'conditions' in condition;
}
