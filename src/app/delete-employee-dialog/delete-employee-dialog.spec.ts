import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LoginService } from '../login/login.service';

const alice = {
  id: 1,
  name: 'Alice',
  departmentId: 7,
  salary: 100,
  country: 'India',
  salaryStructureDto: null,
};
const bob = { ...alice, id: 2, name: 'Bob' };
const department = { id: 7, name: 'Engineering', totalEmployees: 2 };

describe('Employee delete confirmation', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoginService,
          useValue: {
            authenticated: () => true,
            session: () => ({ name: 'Tester', loginTime: '2026-10-31T10:15:30Z' }),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function setup() {
    const harness = await RouterTestingHarness.create('/employee/7');
    http.expectOne('http://localhost:8080/departments').flush([department]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([alice, bob]);
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const dialog = page.querySelector<HTMLDialogElement>('app-delete-employee-dialog dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    const buttons = page.querySelectorAll<HTMLButtonElement>('.delete-employee');
    return { harness, page, dialog, buttons };
  }

  it('shows accessible pencil and delete icons, names the clicked employee, and deletes only after OK', async () => {
    const { harness, page, dialog, buttons } = await setup();
    const edit = page.querySelector<HTMLButtonElement>('.edit-employee')!;
    expect(edit.querySelector('svg')).not.toBeNull();
    expect(edit.getAttribute('aria-label')).toBe('Edit Alice');
    expect(edit.textContent?.trim()).toBe('');
    expect(buttons[1].querySelector('svg')).not.toBeNull();
    expect(buttons[1].getAttribute('aria-label')).toBe('Delete Bob');
    buttons[1].click();
    harness.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#delete-question')?.textContent).toBe(
      'Are you sure, you want to delete Bob ?',
    );
    http.expectNone((request) => request.method === 'DELETE');
    dialog.querySelector<HTMLButtonElement>('.confirm-delete')!.click();
    harness.detectChanges();
    expect(dialog.querySelector<HTMLButtonElement>('.close')?.disabled).toBe(true);
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    const request = http.expectOne('http://localhost:8080/employees/2');
    expect(request.request.method).toBe('DELETE');
    request.flush({ id: 2, message: 'Employee Deleted Successfully' });
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(false);
    http
      .expectOne('http://localhost:8080/departments')
      .flush([{ ...department, totalEmployees: 1 }]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([alice]);
    harness.detectChanges();
    expect(page.querySelector('tbody')?.textContent).toContain('Alice');
    expect(page.querySelector('tbody')?.textContent).not.toContain('Bob');
    expect(page.textContent).toContain('1 employees');
    expect(TestBed.inject(Router).url).toBe('/employee/7');
    expect(page.querySelector('.notification')?.textContent).toContain(
      'Employee Deleted Successfully',
    );
  }, 15000);

  it('closes with the close icon or Escape without deleting and restores focus', async () => {
    const { harness, dialog, buttons } = await setup();
    buttons[0].focus();
    buttons[0].click();
    harness.detectChanges();
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    harness.detectChanges();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(buttons[0]);
    buttons[1].focus();
    buttons[1].click();
    harness.detectChanges();
    expect(dialog.textContent).toContain('Bob');
    expect(dialog.textContent).not.toContain('Alice');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    dialog.close();
    harness.detectChanges();
    expect(document.activeElement).toBe(buttons[1]);
    http.expectNone((request) => request.method === 'DELETE');
  });

  it('keeps the confirmation open on errors and lets the user retry', async () => {
    const { harness, page, dialog, buttons } = await setup();
    buttons[0].click();
    harness.detectChanges();
    dialog.querySelector<HTMLButtonElement>('.confirm-delete')!.click();
    http
      .expectOne('http://localhost:8080/employees/1')
      .flush({}, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('Unable to delete');
    expect(dialog.querySelector<HTMLButtonElement>('.confirm-delete')?.disabled).toBe(false);
    expect(page.querySelector('.notification')).toBeNull();
    dialog.querySelector<HTMLButtonElement>('.confirm-delete')!.click();
    http
      .expectOne('http://localhost:8080/employees/1')
      .flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(dialog.textContent).toContain('no longer exists');
    http.expectNone((request) => request.method === 'GET');
  });
});
