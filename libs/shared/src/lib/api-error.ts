import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'The server is unavailable. Check your connection and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      default:
        break;
    }

    const detail = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg: string; loc?: string[] }) => `${item.loc?.join('.') ?? ''}: ${item.msg}`)
        .join('; ');
    }
  }

  return 'Unable to complete the action. Please try again.';
}
