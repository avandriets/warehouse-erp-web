import type { EntityDataOperationState, UIStateStatus } from '../types';
import { combineUIStates } from './combine-ui-states';
import { entityEditorState } from './entity-editor-state';

const ready: UIStateStatus<string> = { resolved: true, rejected: false, pending: false, err: null };
const retrieved: EntityDataOperationState = { type: 'getById', status: 'success', error: null, correlationId: 'read' };

describe('combined UI state', () => {
  it('waits for every dependency, retaining a concurrent error and pending state', () => {
    expect(
      combineUIStates(
        ready,
        { ...ready, resolved: false, pending: true },
        { ...ready, resolved: false, rejected: true, err: 'Offline' },
      ),
    ).toEqual({ resolved: false, rejected: true, pending: true, err: 'Offline' });
  });
  it('keeps loaded content resolved during refresh and leaves empty-state decisions to the screen', () => {
    expect(combineUIStates(ready, { ...ready, empty: true, pending: true })).toEqual({ ...ready, pending: true });
    expect(combineUIStates()).toEqual(ready);
  });
  it('uses a rejected dependency message before an unrelated action error', () => {
    expect(
      combineUIStates({ ...ready, err: 'Save failed' }, { ...ready, rejected: true, err: 'Read failed' }).err,
    ).toBe('Read failed');
  });
});

describe('entity editor state', () => {
  it('requires a successful retrieval even if a reference list already contains the record', () => {
    expect(entityEditorState({ editing: true, exists: true, operation: null })).toMatchObject({
      resolved: false,
      pending: true,
    });
    expect(
      entityEditorState({ editing: true, exists: true, operation: { ...retrieved, status: 'pending' } }),
    ).toMatchObject({ resolved: false, pending: true });
    expect(entityEditorState({ editing: true, exists: true, operation: retrieved })).toEqual(ready);
  });
  it('shows a retrieval failure as rejected and a write failure as an action error with the record retained', () => {
    expect(
      entityEditorState({
        editing: true,
        exists: false,
        operation: { ...retrieved, status: 'error', error: 'Missing' },
      }),
    ).toMatchObject({ resolved: false, rejected: true, pending: false, err: 'Missing' });
    expect(
      entityEditorState({
        editing: true,
        exists: true,
        operation: { ...retrieved, type: 'update', status: 'error', error: 'Conflict' },
      }),
    ).toEqual({ ...ready, err: 'Conflict' });
  });
  it('supports creation and keeps the editor resolved during saving', () => {
    expect(entityEditorState({ editing: false, exists: false, operation: null })).toEqual(ready);
    expect(
      entityEditorState({
        editing: true,
        exists: true,
        operation: { ...retrieved, type: 'update', status: 'pending' },
        saving: true,
      }),
    ).toEqual({ ...ready, pending: true });
  });
});
