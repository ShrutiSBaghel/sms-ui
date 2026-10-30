import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

const alice = { id: 1, name: 'Alice', departmentId: 7, salary: 12345.67, country: 'India' };

describe('Employee page', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a direct department URL and displays employees and pagination', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    expect(harness.routeNativeElement?.textContent).toContain('Loading employees');
    http.expectOne('/departments').flush([{ id: 7, name: 'Engineering', totalEmployees: 21 }]);
    http.expectOne('/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    expect(element.textContent).toContain('Engineering');
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
    expect(element.querySelector('.salary-link')?.textContent).toContain('12,345.67');
    expect(element.textContent).toContain('Page 1 of 2');
    const buttons = element.querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(buttons[0].disabled).toBe(true);
    buttons[1].click();
    http.expectOne('/employees?dep_id=7&page=1&size=20').flush([]);
    harness.detectChanges();
    expect(element.textContent).toContain('Page 2 of 2');
    expect(element.textContent).toContain('No employees found');
    expect(buttons[1].disabled).toBe(true);
    buttons[0].click();
    http.expectOne('/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
  });

  it('shows an error and retries from the page', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    http.expectOne('/departments').flush([{ id: 7, name: 'Engineering', totalEmployees: 0 }]);
    http
      .expectOne('/employees?dep_id=7&page=0&size=20')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load employees',
    );
    (
      harness.routeNativeElement!.querySelector('[role="alert"] button') as HTMLButtonElement
    ).click();
    http.expectOne('/departments').flush([{ id: 7, name: 'Engineering', totalEmployees: 0 }]);
    http.expectOne('/employees?dep_id=7&page=0&size=20').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No employees found');
    expect(harness.routeNativeElement?.querySelector('.pagination')).toBeNull();
  });

  it('opens the empty salary dialog from a salary link', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    http.expectOne('/departments').flush([{ id: 7, name: 'Engineering', totalEmployees: 1 }]);
    http.expectOne('/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    const dialog = harness.routeNativeElement!.querySelector('dialog')!;
    // jsdom does not implement the browser's native dialog methods.
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.showModal = showModal;
    (harness.routeNativeElement!.querySelector('.salary-link') as HTMLButtonElement).click();
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog.getAttribute('aria-label')).toBe('Salary structure');
    expect(dialog.querySelector('table')).toBeNull();
  });
});
