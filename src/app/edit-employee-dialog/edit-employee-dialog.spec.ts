import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LoginService } from '../login/login.service';
import type { EmployeeDto } from '../employee/employee.service';

const department = { id: 7, name: 'Engineering', totalEmployees: 2 };
const alice: EmployeeDto = {
  id: 1,
  name: 'Alice',
  country: 'India',
  departmentId: 7,
  salary: 11750.2,
  salaryStructureDto: {
    empId: 1,
    fixedPay: 10000.1,
    variablePay: 2000.25,
    bonuses: 500.3,
    deduction: 750.45,
  },
};
const bob: EmployeeDto = {
  ...alice,
  id: 2,
  name: 'Bob',
  country: 'Canada',
  salary: 21750.2,
  salaryStructureDto: { ...alice.salaryStructureDto!, empId: 2, fixedPay: 20000.1 },
};

describe('Edit employee dialog', () => {
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
    const dialog = page.querySelector<HTMLDialogElement>('app-edit-employee-dialog dialog')!;
    const createDialog = page.querySelector<HTMLDialogElement>(
      'app-create-employee-dialog dialog',
    )!;
    for (const modal of [dialog, createDialog]) {
      modal.showModal = vi.fn(() => modal.setAttribute('open', ''));
      modal.close = vi.fn(() => {
        modal.removeAttribute('open');
        modal.dispatchEvent(new Event('close'));
      });
    }
    const buttons = page.querySelectorAll<HTMLButtonElement>('.edit-employee');
    return { harness, page, dialog, createDialog, buttons };
  }

  function fill(dialog: HTMLDialogElement, id: string, value: string) {
    const input = dialog.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('prefills the clicked row, updates through PUT, refreshes the list, and shows the updated popup', async () => {
    const { harness, page, dialog, buttons } = await setup();
    buttons[1].click();
    harness.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-name')?.value).toBe('Bob');
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-country')?.value).toBe('Canada');
    expect(dialog.querySelector<HTMLInputElement>('#edit-fixedPay')?.value).toBe('20000.10');
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-department')?.value).toBe(
      'Engineering',
    );
    expect(dialog.querySelector('output')?.textContent).toBe('21750.20');
    fill(dialog, 'edit-employee-name', ' Bob Updated ');
    fill(dialog, 'edit-employee-country', 'UK');
    fill(dialog, 'edit-fixedPay', '22000.15');
    harness.detectChanges();
    expect(dialog.querySelector('output')?.textContent).toBe('23750.25');
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    harness.detectChanges();
    expect(dialog.querySelector<HTMLButtonElement>('.close')?.disabled).toBe(true);
    const request = http.expectOne('http://localhost:8080/employees/2');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      name: 'Bob Updated',
      country: 'UK',
      departmentId: 7,
      salaryStructureDto: {
        fixedPay: '22000.15',
        variablePay: '2000.25',
        bonuses: '500.30',
        deduction: '750.45',
      },
    });
    const updated = {
      ...bob,
      name: 'Bob Updated',
      country: 'UK',
      salary: 23750.25,
      salaryStructureDto: { ...bob.salaryStructureDto!, fixedPay: 22000.15 },
    };
    request.flush(updated);
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/employee/7');
    http.expectOne('http://localhost:8080/departments').flush([department]);
    http
      .expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20')
      .flush([alice, updated]);
    harness.detectChanges();
    expect(page.querySelector('tbody')?.textContent).toContain('Bob Updated');
    expect(page.querySelector('tbody')?.textContent).toContain('23,750.25');
    expect(page.querySelector('app-header .notification')?.textContent).toContain(
      'Employee Updated Successfully',
    );
    http.expectNone((request) => request.method === 'POST');
  }, 15000);

  it('cancels without changing employee data and keeps create and edit drafts independent', async () => {
    const { harness, page, dialog, createDialog, buttons } = await setup();
    buttons[0].focus();
    buttons[0].click();
    harness.detectChanges();
    fill(dialog, 'edit-employee-name', 'Unsaved Alice');
    dialog.querySelector<HTMLButtonElement>('form button[type="button"]')!.click();
    harness.detectChanges();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(buttons[0]);
    expect(page.querySelector('tbody')?.textContent).not.toContain('Unsaved Alice');
    buttons[1].click();
    harness.detectChanges();
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-name')?.value).toBe('Bob');
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('.new-employee')!.click();
    harness.detectChanges();
    expect(createDialog.querySelector<HTMLInputElement>('#employee-name')?.value).toBe('');
    expect(createDialog.querySelector<HTMLInputElement>('#fixedPay')?.value).toBe('0.00');
    fill(createDialog, 'employee-name', 'New Draft');
    createDialog.querySelector<HTMLButtonElement>('.close')!.click();
    harness.detectChanges();
    buttons[0].click();
    harness.detectChanges();
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-name')?.value).toBe('Alice');
    expect(dialog.querySelector<HTMLInputElement>('#edit-fixedPay')?.value).toBe('10000.10');
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it('keeps invalid and failed edits open without showing success or refreshing the list', async () => {
    const { harness, page, dialog, buttons } = await setup();
    buttons[0].click();
    harness.detectChanges();
    fill(dialog, 'edit-deduction', '99999');
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    harness.detectChanges();
    expect(dialog.textContent).toContain('Deduction cannot exceed');
    http.expectNone((request) => request.method === 'PUT');
    fill(dialog, 'edit-deduction', '750.45');
    fill(dialog, 'edit-employee-name', 'Alice Draft');
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    http
      .expectOne('http://localhost:8080/employees/1')
      .flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector<HTMLInputElement>('#edit-employee-name')?.value).toBe(
      'Alice Draft',
    );
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('no longer exists');
    expect(page.querySelector('.notification')).toBeNull();
    http.expectNone((request) => request.method === 'GET' || request.method === 'POST');
  });
});
