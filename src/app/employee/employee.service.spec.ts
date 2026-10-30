import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EmployeeService } from './employee.service';

const departments = [{ id: 7, name: 'Engineering', totalEmployees: 41 }];

describe('EmployeeService', () => {
  let service: EmployeeService;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ departmentId: '7' }));
    TestBed.configureTestingModule({
      providers: [
        EmployeeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
      ],
    });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function employeesRequest(page = 0, departmentId = 7) {
    return http.expectOne(
      (request) =>
        request.url === '/employees' &&
        request.params.get('dep_id') === String(departmentId) &&
        request.params.get('page') === String(page) &&
        request.params.get('size') === '20',
    );
  }

  it('uses department totals for page count and stops at the final page', () => {
    service.initialize();
    expect(service.loading()).toBe(true);
    http.expectOne('/departments').flush(departments);
    employeesRequest().flush([]);
    expect(service.totalPages()).toBe(3);
    expect(service.canPrevious()).toBe(false);
    service.previousPage();
    http.expectNone('/employees');
    service.nextPage();
    employeesRequest(1).flush([]);
    service.nextPage();
    employeesRequest(2).flush([]);
    expect(service.canNext()).toBe(false);
    service.nextPage();
    http.expectNone('/employees');
    service.previousPage();
    employeesRequest(1).flush([]);
    expect(service.page()).toBe(1);
    http.expectNone('/departments');
  });

  it('cancels old requests and resets pagination when the route changes', () => {
    service.initialize();
    const oldDepartments = http.expectOne('/departments');
    const oldEmployees = employeesRequest();
    params.next(convertToParamMap({ departmentId: '8' }));
    expect(oldDepartments.cancelled).toBe(true);
    expect(oldEmployees.cancelled).toBe(true);
    http.expectOne('/departments').flush([{ id: 8, name: 'HR', totalEmployees: 1 }]);
    employeesRequest(0, 8).flush([
      { id: 3, name: 'Alice', departmentId: 8, salary: 1000, country: 'India' },
    ]);
    expect(service.department()?.id).toBe(8);
    expect(service.employees()[0].departmentId).toBe(8);
    expect(service.page()).toBe(0);
  });

  it('retries failed requests and rejects invalid department IDs', () => {
    service.initialize();
    http.expectOne('/departments').flush(departments);
    employeesRequest().flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(service.error()).toContain('Unable to load employees');
    expect(service.loading()).toBe(false);
    service.retry();
    http.expectOne('/departments').flush(departments);
    employeesRequest().flush([]);
    expect(service.error()).toBeNull();
    params.next(convertToParamMap({ departmentId: 'abc' }));
    expect(service.error()).toContain('Invalid department');
    http.expectNone('/employees');
  });

  it('reports a missing department without displaying employees', () => {
    service.initialize();
    http.expectOne('/departments').flush([]);
    employeesRequest().flush([]);
    expect(service.error()).toContain('Department not found');
    expect(service.employees()).toEqual([]);
  });
});
