import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { LoginService } from './login.service';
import { API_BASE_URL } from '../api.config';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let login: LoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://sms-api-test.vercel.app' },
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    login = TestBed.inject(LoginService);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function signIn(token = 'test.jwt.token') {
    login.login('tester', 'test-password');
    const request = http.expectOne('https://sms-api-test.vercel.app/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({
      authenticated: true,
      name: 'tester',
      loginTime: '2026-10-31T10:15:30Z',
      token,
    });
  }

  it('adds the token to backend API requests only', () => {
    signIn();
    client.get('https://sms-api-test.vercel.app/departments').subscribe();
    const api = http.expectOne('https://sms-api-test.vercel.app/departments');
    expect(api.request.headers.get('Authorization')).toBe('Bearer test.jwt.token');
    api.flush([]);
    for (const url of [
      'https://example.com/data',
      'http://localhost:8080/departments',
      'https://sms-api-test.vercel.app.evil.example/data',
      'https://sms-api-test.vercel.app.example.com/data',
      '/assets/data.json',
    ]) {
      client.get(url).subscribe();
      const external = http.expectOne(url);
      expect(external.request.headers.has('Authorization')).toBe(false);
      external.flush([]);
    }
  });

  it('does not attach a token to login or unauthenticated requests', () => {
    client.get('https://sms-api-test.vercel.app/departments').subscribe();
    const anonymous = http.expectOne('https://sms-api-test.vercel.app/departments');
    expect(anonymous.request.headers.has('Authorization')).toBe(false);
    anonymous.flush([]);
    signIn();
    login.login('tester', 'incorrect');
    const request = http.expectOne('https://sms-api-test.vercel.app/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(login.error()).toBe('Incorrect username or password.');
    expect(login.accessToken()).toBeNull();
  });

  it('clears the current session and returns to login on an API 401', () => {
    signIn();
    client.get('https://sms-api-test.vercel.app/departments').subscribe({ error: () => {} });
    http
      .expectOne('https://sms-api-test.vercel.app/departments')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(login.accessToken()).toBeNull();
    expect(login.authenticated()).toBe(false);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenLastCalledWith('/', {
      replaceUrl: true,
    });
  });

  it('ignores a stale 401 after another login and preserves sessions on other errors', () => {
    signIn('old-token');
    client.get('https://sms-api-test.vercel.app/departments').subscribe({ error: () => {} });
    const stale = http.expectOne('https://sms-api-test.vercel.app/departments');
    signIn('new-token');
    stale.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(login.accessToken()).toBe('new-token');
    client.get('https://sms-api-test.vercel.app/employees').subscribe({ error: () => {} });
    http
      .expectOne('https://sms-api-test.vercel.app/employees')
      .flush({}, { status: 500, statusText: 'Server error' });
    expect(login.authenticated()).toBe(true);
  });

  it('does not send the previous token after logout', () => {
    signIn();
    login.logout();
    client.get('https://sms-api-test.vercel.app/departments').subscribe();
    const request = http.expectOne('https://sms-api-test.vercel.app/departments');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });
});
