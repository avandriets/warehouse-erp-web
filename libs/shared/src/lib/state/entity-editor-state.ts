import type { EntityEditorStateOptions, UIStateStatus } from '../types';

export function entityEditorState({
  editing,
  exists,
  operation,
  saving = false,
}: EntityEditorStateOptions): UIStateStatus<string> {
  return {
    resolved: !editing || (exists && !!operation && (operation.type !== 'getById' || operation.status === 'success')),
    rejected: editing && operation?.type === 'getById' && operation.status === 'error',
    pending: saving || (editing && (!operation || operation.status === 'pending')),
    err: operation?.error ?? null,
  };
}
