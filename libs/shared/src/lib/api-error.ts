import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'The server is unavailable. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item: { msg: string; loc?: string[] }) => `${item.loc?.join('.') ?? ''}: ${item.msg}`).join('; ');
  }
  return 'Unable to complete the action. Please try again.';
}
