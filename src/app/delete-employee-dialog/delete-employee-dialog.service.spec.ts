import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api.config';
import { DashboardService } from '../dashboard/dashboard.service';
import type { EmployeeDto } from '../employee/employee.service';
import { HeaderService } from '../header/header.service';
import { DeleteEmployeeDialogService } from './delete-employee-dialog.service';

const alice: EmployeeDto = {
  id: 1,
  name: 'Alice',
  departmentId: 7,
  salary: 100,
  country: 'India',
  salaryStructureDto: null,
};

describe('DeleteEmployeeDialogService', () => {
  let service: DeleteEmployeeDialogService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DeleteEmployeeDialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
      ],
    });
    service = TestBed.inject(DeleteEmployeeDialogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('waits for confirmation, DELETEs only the selected ID once, and invalidates department counts', () => {
    const dashboard = TestBed.inject(DashboardService);
    dashboard.loadDepartments();
    http
      .expectOne('https://api.example.test/departments')
      .flush([{ id: 7, name: 'Engineering', totalEmployees: 1 }]);
    service.confirm();
    service.open(alice);
    http.expectNone((request) => request.method === 'DELETE');
    service.confirm();
    service.confirm();
    const request = http.expectOne('https://api.example.test/employees/1');
    expect(request.request.method).toBe('DELETE');
    expect(service.deleting()).toBe(true);
    expect(TestBed.inject(HeaderService).notification()).toBeNull();
    request.flush({ id: 1, message: 'Employee Deleted Successfully' });
    expect(service.deleted()).toBe(true);
    expect(service.deleting()).toBe(false);
    expect(dashboard.departments()).toEqual([]);
    expect(TestBed.inject(HeaderService).notification()).toBe('Employee Deleted Successfully');
    service.confirm();
    http.expectNone((request) => request.method === 'DELETE');
  });

  it('keeps failures open for retry and never reports success before deletion', () => {
    service.open(alice);
    service.confirm();
    http
      .expectOne('https://api.example.test/employees/1')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(service.deleted()).toBe(false);
    expect(service.employee()?.name).toBe('Alice');
    expect(service.error()).toContain('Unable to delete');
    expect(TestBed.inject(HeaderService).notification()).toBeNull();
    service.confirm();
    http
      .expectOne('https://api.example.test/employees/1')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(service.error()).toContain('no longer exists');
    expect(service.deleting()).toBe(false);
  });

  it('clears canceled selections and targets the newly selected employee', () => {
    service.open(alice);
    service.clear();
    service.confirm();
    http.expectNone((request) => request.method === 'DELETE');
    service.open({ ...alice, id: 2, name: 'Bob' });
    service.confirm();
    const request = http.expectOne('https://api.example.test/employees/2');
    service.clear();
    expect(request.cancelled).toBe(true);
    expect(service.employee()).toBeNull();
    expect(TestBed.inject(HeaderService).notification()).toBeNull();
  });
});
