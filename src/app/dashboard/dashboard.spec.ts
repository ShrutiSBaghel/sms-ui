import { LoginService } from '../login/login.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('Dashboard navigation', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LoginService,
          useValue: {
            authenticated: () => true,
            session: () => ({ name: 'Tester', loginTime: '2026-10-31T10:15:30Z' }),
          },
        },
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // The first navigation loads the real lazy route chunks as well as rendering the page.
  it('shows departments by default, routes to employees, and returns Home', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Loading departments');
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 12 }]);
    harness.detectChanges();
    const row = harness.routeNativeElement!.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Engineering');
    expect(row.textContent).toContain('12');
    const link = row.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/employee/7');
    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/employee/7');
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([]);
    http.expectNone('http://localhost:8080/departments');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No employees found');
    expect(harness.routeNativeElement?.querySelector('app-header')).toBeTruthy();
    (harness.routeNativeElement!.querySelector('nav a') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectOne('http://localhost:8080/departments').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No departments found');
  }, 15000);

  it('shows an error and retries from the dashboard', async () => {
    const harness = await RouterTestingHarness.create('/dashboard');
    http
      .expectOne('http://localhost:8080/departments')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load departments',
    );
    (
      harness.routeNativeElement!.querySelector('[role="alert"] button') as HTMLButtonElement
    ).click();
    http.expectOne('http://localhost:8080/departments').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No departments found');
  });

  it('supports opening an employee URL directly', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Employees');
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 0 }]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([]);
  });
});
