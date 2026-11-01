import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api.config';
import { DashboardService } from '../dashboard/dashboard.service';
import { HeaderService } from '../header/header.service';
import { EmployeeFormDialogService } from './employee-form-dialog.service';
import type { EmployeeDto } from '../employee/employee.service';

const department = { id: 7, name: 'Engineering', totalEmployees: 20 };
const baseUrl = 'https://api.example.test';
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
const validValues = {
  name: ' Alice ',
  country: ' India ',
  fixedPay: '1000.10',
  variablePay: '0.20',
  bonuses: '0.30',
  deduction: '0.15',
};

describe('EmployeeFormDialogService', () => {
  let service: EmployeeFormDialogService;
  let http: HttpTestingController;
  let header: HeaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmployeeFormDialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    service = TestBed.inject(EmployeeFormDialogService);
    http = TestBed.inject(HttpTestingController);
    header = TestBed.inject(HeaderService);
  });
  afterEach(() => http.verify());

  function open() {
    service.open('create', department);
    service.form.setValue(validValues);
  }

  it('prefills edits and PUTs the selected ID while omitting generated and calculated fields', () => {
    service.open('edit', department, alice);
    expect(service.editing()).toBe(true);
    expect(service.form.getRawValue()).toEqual({
      name: 'Alice',
      country: 'India',
      fixedPay: '10000.10',
      variablePay: '2000.25',
      bonuses: '500.30',
      deduction: '750.45',
    });
    expect(service.total()).toBe('11750.20');
    service.form.patchValue({ name: ' Alice Updated ', fixedPay: '12000.15' });
    service.submit();
    service.submit();
    const update = http.expectOne(`${baseUrl}/employees/1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({
      name: 'Alice Updated',
      country: 'India',
      departmentId: 7,
      salaryStructureDto: {
        fixedPay: '12000.15',
        variablePay: '2000.25',
        bonuses: '500.30',
        deduction: '750.45',
      },
    });
    expect(header.notification()).toBeNull();
    update.flush(null);
    expect(service.saved()).toBe(true);
    expect(header.notification()).toBe('Employee Updated Successfully');
    service.submit();
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it('preserves failed edits and uses the next selected employee after cancellation', () => {
    service.open('edit', department, alice);
    service.form.controls.name.setValue('Alice Draft');
    service.submit();
    http.expectOne(`${baseUrl}/employees/1`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(service.form.controls.name.value).toBe('Alice Draft');
    expect(service.error()).toContain('no longer exists');
    expect(service.saved()).toBe(false);
    expect(header.notification()).toBeNull();
    service.clear();
    service.open('edit', department, { ...alice, id: 2, name: 'Bob' });
    expect(service.form.controls.name.value).toBe('Bob');
    service.submit();
    const update = http.expectOne(`${baseUrl}/employees/2`);
    expect(update.request.method).toBe('PUT');
    service.clear();
    expect(update.cancelled).toBe(true);
    service.open('create', department);
    expect(service.editing()).toBe(false);
    expect(service.form.controls.name.value).toBe('');
    expect(service.form.controls.fixedPay.value).toBe('0.00');
  });

  it('blocks edits with missing salary structure or invalid employee context', () => {
    for (const employee of [
      { ...alice, salaryStructureDto: null },
      { ...alice, id: 0 },
      { ...alice, departmentId: 8 },
    ]) {
      service.open('edit', department, employee);
      service.form.setValue(validValues);
      service.submit();
      expect(service.unavailable()).toBe(true);
      expect(service.error()).toContain('unavailable');
    }
    expect(header.notification()).toBeNull();
    http.expectNone((request) => request.method === 'POST' || request.method === 'PUT');
  });

  it.each([200, 201])(
    'notifies after HTTP %s, invalidates counts, and prevents duplicate submissions',
    (status) => {
      const dashboard = TestBed.inject(DashboardService);
      dashboard.loadDepartments();
      http.expectOne(`${baseUrl}/departments`).flush([department]);
      open();
      http.expectNone(`${baseUrl}/departments`);
      expect(service.total()).toBe('1000.45');
      service.submit();
      service.submit();
      expect(header.notification()).toBeNull();
      expect(service.saving()).toBe(true);
      const request = http.expectOne(`${baseUrl}/employees`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        name: 'Alice',
        country: 'India',
        departmentId: 7,
        salaryStructureDto: {
          fixedPay: '1000.10',
          variablePay: '0.20',
          bonuses: '0.30',
          deduction: '0.15',
        },
      });
      request.flush(null, { status, statusText: status === 201 ? 'Created' : 'OK' });
      expect(dashboard.departments()).toEqual([]);
      expect(service.saved()).toBe(true);
      expect(header.notification()).toBe('Employee Created Successfully');
      service.submit();
      http.expectNone(`${baseUrl}/employees`);
    },
  );

  it.each([
    ['name', '   '],
    ['name', 'a'.repeat(256)],
    ['country', ''],
    ['fixedPay', '-1'],
    ['bonuses', '1.001'],
    ['variablePay', '1e3'],
    ['deduction', ''],
    ['fixedPay', '1'.repeat(37)],
  ])('rejects invalid %s input %s without a request or notification', (field, value) => {
    open();
    service.form.get(field)!.setValue(value);
    service.submit();
    expect(service.form.get(field)!.invalid).toBe(true);
    expect(service.form.get(field)!.touched).toBe(true);
    expect(header.notification()).toBeNull();
    http.expectNone(`${baseUrl}/employees`);
  });

  it('rejects negative or overflowing totals while preserving decimal precision', () => {
    open();
    service.form.controls.deduction.setValue('2000');
    service.submit();
    expect(service.totalError()).toContain('Deduction cannot exceed');
    service.form.patchValue({
      fixedPay: '9'.repeat(36),
      variablePay: '1',
      bonuses: '0',
      deduction: '0',
    });
    service.submit();
    expect(service.totalError()).toContain('36 integer digits');
    http.expectNone(`${baseUrl}/employees`);
    service.form.patchValue({
      fixedPay: '9007199254740993.99',
      variablePay: '0.02',
      bonuses: '0',
      deduction: '0.01',
    });
    expect(service.total()).toBe('9007199254740994.00');
    service.submit();
    const request = http.expectOne(`${baseUrl}/employees`);
    expect(request.request.body.salaryStructureDto.fixedPay).toBe('9007199254740993.99');
    request.flush({}, { status: 500, statusText: 'Server Error' });
  });

  it('retains fields on failure, supports retry, and shows no success notification on errors', () => {
    open();
    service.submit();
    http.expectOne(`${baseUrl}/employees`).flush({}, { status: 400, statusText: 'Bad Request' });
    expect(service.error()).toContain('Check the fields');
    expect(service.form.getRawValue()).toEqual(validValues);
    expect(service.saving()).toBe(false);
    expect(service.saved()).toBe(false);
    expect(header.notification()).toBeNull();
    service.submit();
    http.expectOne(`${baseUrl}/employees`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(service.error()).toContain('department no longer exists');
    expect(header.notification()).toBeNull();
  });

  it('clears canceled form data and uses the newly selected department on reopening', () => {
    open();
    service.clear();
    expect(service.department()).toBeNull();
    service.submit();
    http.expectNone(`${baseUrl}/employees`);
    service.open('create', { id: 8, name: 'HR', totalEmployees: 0 });
    expect(service.form.controls.name.value).toBe('');
    expect(service.form.controls.fixedPay.value).toBe('0.00');
    service.form.setValue(validValues);
    service.submit();
    const request = http.expectOne(`${baseUrl}/employees`);
    expect(request.request.body.departmentId).toBe(8);
    service.clear();
    expect(request.cancelled).toBe(true);
    expect(header.notification()).toBeNull();
  });
});
