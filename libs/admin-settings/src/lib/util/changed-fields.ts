export function changedFields<T extends object>(values: T, original: T): Partial<T> {
  const changes: Partial<T> = {};
  for (const key of Object.keys(values) as (keyof T)[]) {
    if (values[key] !== original[key]) {
      changes[key] = values[key];
    }
  }

  return changes;
}
