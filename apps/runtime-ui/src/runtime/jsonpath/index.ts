// Safety: Reject dangerous paths
function validatePath(path: string): void {
  // Enforce $ or $. prefix
  if (path !== '$' && !path.startsWith('$.')) {
    throw new Error('Path must start with "$" or "$." (e.g., "$.application.name")');
  }

  // Reject array/wildcard syntax (not supported in v0)
  if (path.match(/[[\]()*]/)) {
    throw new Error('Array and wildcard syntax not supported in paths');
  }

  // Reject parent traversal
  if (path.includes('..')) {
    throw new Error('Parent traversal (..) not allowed in paths');
  }

  // Reject prototype pollution
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const parts = path.replace(/^\$\./, '').split('.');
  for (const part of parts) {
    if (dangerousKeys.includes(part)) {
      throw new Error(`Dangerous key "${part}" not allowed in paths`);
    }
  }
}

export function getJsonPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path || path === '$') return obj;

  validatePath(path);

  const parts = path.replace(/^\$\./, '').split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

export function setJsonPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  if (!path || path === '$') return value as Record<string, unknown>;

  validatePath(path);

  const parts = path.replace(/^\$\./, '').split('.');
  const result = { ...obj };
  let current: any = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    } else {
      current[part] = { ...current[part] };
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return result;
}
