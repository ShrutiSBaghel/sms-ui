import { LoginService } from '../login/login.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

const alice = {
  id: 1,
  name: 'Alice',
  departmentId: 7,
  salary: 12345.67,
  country: 'India',
  salaryStructureDto: {
    empId: 1,
    fixedPay: 10000.1,
    variablePay: 2000.25,
    bonuses: 500.3,
    deduction: 750.45,
  },
};

describe('Employee page', () => {
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
  it('loads a direct department URL and displays employees and pagination', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    expect(harness.routeNativeElement?.textContent).toContain('Loading employees');
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 21 }]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    const element = harness.routeNativeElement!;
    expect(element.textContent).toContain('Engineering');
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
    expect(element.querySelector('.salary-link')?.textContent).toContain('12,345.67');
    expect(element.textContent).toContain('Page 1 of 2');
    const buttons = element.querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(buttons[0].disabled).toBe(true);
    buttons[1].click();
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=1&size=20').flush([]);
    harness.detectChanges();
    expect(element.textContent).toContain('Page 2 of 2');
    expect(element.textContent).toContain('No employees found');
    expect(buttons[1].disabled).toBe(true);
    buttons[0].click();
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Alice');
  }, 15000);

  it('shows an error and retries from the page', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 0 }]);
    http
      .expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Unable to load employees',
    );
    (
      harness.routeNativeElement!.querySelector('[role="alert"] button') as HTMLButtonElement
    ).click();
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 0 }]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No employees found');
    expect(harness.routeNativeElement?.querySelector('.pagination')).toBeNull();
  });

  it('opens the clicked row employee and can switch between salary structures', async () => {
    const harness = await RouterTestingHarness.create('/employee/7');
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 2 }]);
    const bob = {
      ...alice,
      id: 2,
      name: 'Bob',
      salaryStructureDto: { ...alice.salaryStructureDto, empId: 2, fixedPay: 20000.1 },
    };
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([alice, bob]);
    harness.detectChanges();
    const dialog = harness.routeNativeElement!.querySelector('dialog')!;
    // jsdom does not implement the browser's native dialog methods.
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.showModal = showModal;
    dialog.close = () => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    };
    const salaryButtons =
      harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.salary-link');
    salaryButtons[1].click();
    expect(showModal).toHaveBeenCalledOnce();
    await harness.fixture.whenStable();
    expect(dialog.textContent).toContain('Bob');
    expect(dialog.textContent).toContain('Employee ID: 2');
    expect(dialog.querySelector('tfoot')?.textContent).toContain('21,750.20');
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    await harness.fixture.whenStable();
    salaryButtons[0].click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(dialog.textContent).toContain('Alice');
    expect(dialog.textContent).not.toContain('Bob');
    expect(dialog.querySelector('tfoot')?.textContent).toContain('11,750.20');
    http.expectNone((request) => request.url.includes('salary-structures'));
  });
});
