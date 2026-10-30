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
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows departments by default, routes to employees, and returns Home', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.textContent).toContain('Loading departments');
    http.expectOne('/departments').flush([{ id: 7, name: 'Engineering', totalEmployees: 12 }]);
    harness.detectChanges();
    const row = harness.routeNativeElement!.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Engineering');
    expect(row.textContent).toContain('12');
    const link = row.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/employee/7');
    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/employee/7');
    expect(harness.routeNativeElement?.textContent).toContain('coming soon');
    expect(harness.routeNativeElement?.querySelector('app-header')).toBeTruthy();
    (harness.routeNativeElement!.querySelector('nav a') as HTMLAnchorElement).click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    http.expectOne('/departments').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No departments found');
  });

  it('shows an error and retries from the dashboard', async () => {
    const harness = await RouterTestingHarness.create('/');
    http.expectOne('/departments').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load departments',
    );
    (harness.routeNativeElement!.querySelector('button') as HTMLButtonElement).click();
    http.expectOne('/departments').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No departments found');
  });

  it('supports opening an employee URL directly', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Employees');
    http.expectNone('/departments');
  });
});
