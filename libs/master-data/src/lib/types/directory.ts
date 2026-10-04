export type DirectoryMode = 'list' | 'create' | 'edit' | 'delete';

export interface DirectoryTableRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly detail: string;
}
