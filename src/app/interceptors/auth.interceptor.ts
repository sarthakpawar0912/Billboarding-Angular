import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('boabp_token');
  const router = inject(Router);

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle specific error cases
      if (error.status === 401) {
        // Unauthorized - token expired or invalid
        localStorage.removeItem('boabp_token');
        localStorage.removeItem('boabp_user');
        router.navigate(['/signin'], {
          queryParams: { expired: 'true' }
        });
        return throwError(() => ({
          ...error,
          error: { message: 'Session expired. Please sign in again.' }
        }));
      }

      if (error.status === 403) {
        // Forbidden - user doesn't have permission
        return throwError(() => ({
          ...error,
          error: { message: error.error?.message || 'You do not have permission to perform this action.' }
        }));
      }

      if (error.status === 404) {
        // Not found
        return throwError(() => ({
          ...error,
          error: { message: error.error?.message || 'The requested resource was not found.' }
        }));
      }

      if (error.status === 409) {
        // Conflict - business state error
        return throwError(() => ({
          ...error,
          error: { message: error.error?.message || 'Operation cannot be performed due to a conflict.' }
        }));
      }

      if (error.status === 400) {
        // Bad request - validation error
        const validationMessage = extractValidationErrors(error);
        return throwError(() => ({
          ...error,
          error: { message: validationMessage, fieldErrors: error.error?.fieldErrors }
        }));
      }

      if (error.status === 500) {
        // Server error - don't expose internal details
        console.error('Server error:', error);
        return throwError(() => ({
          ...error,
          error: { message: 'An unexpected error occurred. Please try again later.' }
        }));
      }

      if (error.status === 0) {
        // Network error
        return throwError(() => ({
          ...error,
          error: { message: 'Unable to connect to server. Please check your internet connection.' }
        }));
      }

      // Default error handling
      return throwError(() => error);
    })
  );
};

/**
 * Extract user-friendly validation error message from backend response
 */
function extractValidationErrors(error: HttpErrorResponse): string {
  const errorBody = error.error;

  // Handle field-level validation errors
  if (errorBody?.fieldErrors) {
    const fieldMessages = Object.entries(errorBody.fieldErrors)
      .map(([field, msg]) => `${formatFieldName(field)}: ${msg}`)
      .join('. ');
    return fieldMessages || 'Please check your input and try again.';
  }

  // Handle single message errors
  if (errorBody?.message) {
    return errorBody.message;
  }

  return 'Invalid input. Please check your data and try again.';
}

/**
 * Format field names to be more user-friendly
 * e.g., "billboardId" -> "Billboard ID"
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, 'ID')
    .trim();
}
