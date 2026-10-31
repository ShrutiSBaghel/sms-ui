import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginService } from './login.service';

const response = {
  authenticated: true,
  name: 'Verified account',
  token: 'test.jwt.token',
  loginTime: '2026-10-31T10:15:30Z',
};

describe('LoginService', () => {
  let login: LoginService;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    login = TestBed.inject(LoginService);
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('stores the verified server identity and timestamp and navigates only on success', () => {
    login.login('submitted', 'password');
    login.login('duplicate', 'password');
    const request = http.expectOne('http://localhost:8080/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'submitted', password: 'password' });
    request.flush(response);
    expect(login.session()).toEqual({ name: response.name, loginTime: response.loginTime });
    expect(login.authenticated()).toBe(true);
    expect(login.accessToken()).toBe(response.token);
    expect(login.loading()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
    expect(JSON.stringify(login.session())).not.toContain('password');
  });

  it('handles unauthorized, network failure and false responses without authentication', () => {
    for (const status of [401, 503]) {
      login.login('tester', 'password');
      http
        .expectOne('http://localhost:8080/auth/login')
        .flush('Error', { status, statusText: 'Error' });
      expect(login.authenticated()).toBe(false);
      expect(login.loading()).toBe(false);
      expect(login.error()).toBeTruthy();
    }
    login.login('tester', 'password');
    http
      .expectOne('http://localhost:8080/auth/login')
      .flush({ authenticated: false, name: null, loginTime: null });
    expect(login.session()).toBeNull();
    expect(login.accessToken()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects incomplete successful responses and keeps login state in memory only', () => {
    expect(login.session()).toBeNull();
    expect(login.accessToken()).toBeNull();
    login.login('tester', 'password');
    http.expectOne('http://localhost:8080/auth/login').flush({ authenticated: true });
    expect(login.error()).toContain('incomplete');
    expect(login.authenticated()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the session and returns to Login on logout', () => {
    login.login('tester', 'password');
    http.expectOne('http://localhost:8080/auth/login').flush(response);
    login.logout();
    expect(login.session()).toBeNull();
    expect(login.accessToken()).toBeNull();
    expect(login.authenticated()).toBe(false);
    expect(login.error()).toBeNull();
    expect(login.loading()).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith('/', { replaceUrl: true });
  });

  it('cancels an unfinished login so a late response cannot log the user back in', () => {
    login.login('tester', 'password');
    const request = http.expectOne('http://localhost:8080/auth/login');
    login.logout();
    expect(request.cancelled).toBe(true);
    expect(login.authenticated()).toBe(false);
    expect(login.loading()).toBe(false);
    expect(navigate).not.toHaveBeenCalledWith('/dashboard');
  });
});
