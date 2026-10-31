import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LoginService } from './login.service';

describe('Login and guarded navigation', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function fillForm(element: HTMLElement) {
    const name = element.querySelector<HTMLInputElement>('#username')!;
    name.value = 'submitted';
    name.dispatchEvent(new Event('input'));
    const password = element.querySelector<HTMLInputElement>('#password')!;
    password.value = 'test-password';
    password.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  }

  it('shows Login at the root and redirects protected URLs without loading employee data', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Welcome back');
    expect(harness.routeNativeElement?.querySelector('app-header')).toBeNull();
    for (const url of ['/dashboard', '/employee/7']) {
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe('/');
      expect(harness.routeNativeElement?.querySelector('#password')).toBeTruthy();
    }
    http.expectNone(
      (request) => request.url.includes('/employees') || request.url.includes('/departments'),
    );
  });

  it('validates required inputs and shows failed authentication', async () => {
    const harness = await RouterTestingHarness.create('/');
    const element = harness.routeNativeElement!;
    element.querySelector<HTMLButtonElement>('button')!.click();
    harness.detectChanges();
    http.expectNone('http://localhost:8080/auth/login');
    expect(element.textContent).toContain('Enter your username');
    fillForm(element);
    expect(element.querySelector<HTMLInputElement>('#password')?.value).toBe('');
    http
      .expectOne('http://localhost:8080/auth/login')
      .flush(
        { authenticated: false, name: null, loginTime: null },
        { status: 401, statusText: 'Unauthorized' },
      );
    harness.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Incorrect username or password',
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('opens the dashboard after login and shows server identity and login time in Profile', async () => {
    const harness = await RouterTestingHarness.create('/');
    fillForm(harness.routeNativeElement!);
    http
      .expectOne('http://localhost:8080/auth/login')
      .flush({
        authenticated: true,
        token: 'test.jwt.token',
        name: 'Server Name',
        loginTime: '2026-10-31T10:15:30Z',
      });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectOne('http://localhost:8080/departments').flush([]);
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    element.querySelector<HTMLElement>('summary')!.click();
    expect(element.querySelector('details')?.open).toBe(true);
    expect(element.querySelector('.profile-name')?.textContent).toBe('Server Name');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-31T10:15:30Z');
    expect(element.querySelector('time')?.textContent?.trim()).toBeTruthy();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.logout')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(LoginService).session()).toBeNull();
    expect(harness.routeNativeElement?.querySelector('#username')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('app-header')).toBeNull();
    for (const url of ['/dashboard', '/employee/7']) {
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe('/');
    }
    http.expectNone(
      (request) => request.url.includes('/employees') || request.url.includes('/departments'),
    );
  });
});
