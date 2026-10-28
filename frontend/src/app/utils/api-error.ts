import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/ledger.models';

/**
 * Turn an HttpErrorResponse from the ledger API into a human-readable message,
 * including field-level validation details when present.
 */
export function describeApiError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody | undefined;
    if (body && body.error) {
      let msg = body.error.message || 'Request failed';
      const details = body.error.details;
      if (Array.isArray(details) && details.length) {
        const fields = details
          .map((d) => (d && typeof d === 'object' && 'message' in d ? (d as any).message : String(d)))
          .join('; ');
        msg += ` (${fields})`;
      }
      return msg;
    }
    if (err.status === 0) {
      return 'Cannot reach the API. Is the backend running on ' + err.url + '?';
    }
    return `HTTP ${err.status}: ${err.statusText}`;
  }
  return 'An unexpected error occurred';
}
