import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

export interface LoginResponseDto {
  authenticated: boolean;
  name: string | null;
  loginTime: string | null;
  token: string | null;
}

export interface LoginSession {
  name: string;
  loginTime: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionState = signal<LoginSession | null>(null);
  private readonly tokenState = signal<string | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly logoutRequests = new Subject<void>();

  readonly session = this.sessionState.asReadonly();
  readonly accessToken = this.tokenState.asReadonly();
  readonly authenticated = computed(() => this.session() !== null && this.accessToken() !== null);
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  login(name: string, password: string): void {
    if (this.loading()) return;
    this.sessionState.set(null);
    this.tokenState.set(null);
    this.errorState.set(null);
    if (!name.trim() || !password.trim()) {
      this.errorState.set('Enter your username and password.');
      return;
    }
    this.loadingState.set(true);
    this.http
      .post<LoginResponseDto>(`${this.apiBaseUrl}/auth/login`, { name: name.trim(), password })
      .pipe(
        takeUntil(this.logoutRequests),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response.authenticated !== true) {
            this.errorState.set('Incorrect username or password.');
          } else if (
            !response.name?.trim() ||
            !response.loginTime ||
            !Number.isFinite(Date.parse(response.loginTime)) ||
            !response.token?.trim()
          ) {
            this.errorState.set('The login response is incomplete. Please try again.');
          } else {
            this.tokenState.set(response.token);
            this.sessionState.set({ name: response.name, loginTime: response.loginTime });
            void this.router.navigateByUrl('/dashboard');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorState.set(
            error.status === 401
              ? 'Incorrect username or password.'
              : error.status === 400
                ? 'Enter a valid username and password.'
                : 'Unable to sign in. Please try again.',
          );
        },
      });
  }

  logout(): void {
    this.logoutRequests.next();
    this.sessionState.set(null);
    this.tokenState.set(null);
    this.errorState.set(null);
    this.loadingState.set(false);
    void this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
