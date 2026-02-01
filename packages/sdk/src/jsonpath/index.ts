/**
 * Restricted JSONPath-like utilities for safe data access.
 * Supports only dot notation (e.g., "step1.field1.value").
 */

/**
 * Get a value from a nested object using dot notation.
 *
 * @param obj - The object to get the value from
 * @param path - Dot-notation path (e.g., "step1.firstName")
 * @returns The value at the path, or undefined if not found
 */
export function getByPath<T = unknown>(
  obj: Record<string, unknown>,
  path: string
): T | undefined {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current as T | undefined;
}

/**
 * Set a value in a nested object using dot notation.
 * Creates intermediate objects as needed.
 *
 * @param obj - The object to modify
 * @param path - Dot-notation path (e.g., "step1.firstName")
 * @param value - The value to set
 * @returns The modified object
 */
export function setByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  if (!path || typeof path !== 'string') {
    return obj;
  }

  const parts = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (current[part] === undefined || typeof current[part] !== 'object') {
      current[part] = {};
    } else {
      current[part] = { ...(current[part] as Record<string, unknown>) };
    }

    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;

  return result;
}

/**
 * Delete a value from a nested object using dot notation.
 *
 * @param obj - The object to modify
 * @param path - Dot-notation path (e.g., "step1.firstName")
 * @returns The modified object
 */
export function deleteByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string
): T {
  if (!path || typeof path !== 'string') {
    return obj;
  }

  const parts = path.split('.');
  const result = { ...obj };

  if (parts.length === 1) {
    delete result[parts[0]];
    return result;
  }

  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (current[part] === undefined || typeof current[part] !== 'object') {
      return result;
    }

    current[part] = { ...(current[part] as Record<string, unknown>) };
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  delete current[lastPart];

  return result;
}

/**
 * Check if a path exists in an object.
 *
 * @param obj - The object to check
 * @param path - Dot-notation path
 * @returns True if the path exists
 */
export function hasPath(obj: Record<string, unknown>, path: string): boolean {
  return getByPath(obj, path) !== undefined;
}
