import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login.service';

export const authGuard: CanActivateFn = () =>
  inject(LoginService).authenticated() || inject(Router).createUrlTree(['/']);

export const guestGuard: CanActivateFn = () =>
  !inject(LoginService).authenticated() || inject(Router).createUrlTree(['/dashboard']);
