import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoginService } from './login.service';
import { API_BASE_URL } from '../api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const apiOrigin = inject(API_BASE_URL);
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return next(request);
  }
  if (url.origin !== apiOrigin || url.pathname === '/auth/login') {
    return next(request);
  }

  const login = inject(LoginService);
  const token = login.accessToken();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      // An older request must not log out a newer session.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token !== null &&
        login.accessToken() === token
      ) {
        login.logout();
      }
      return throwError(() => error);
    }),
  );
};
