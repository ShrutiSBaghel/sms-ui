import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the backend response and prevents duplicate in-flight requests', () => {
    service.loadDepartments();
    service.loadDepartments();
    expect(service.loading()).toBe(true);
    const request = http.expectOne('/departments');
    expect(request.request.method).toBe('GET');
    const departments = [{ id: 7, name: 'Engineering', totalEmployees: 12 }];
    request.flush(departments);
    expect(service.departments()).toEqual(departments);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('allows retry after a failed request and handles an empty list', () => {
    service.loadDepartments();
    http.expectOne('/departments').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(service.loading()).toBe(false);
    expect(service.error()).toContain('Unable to load departments');
    service.loadDepartments();
    expect(service.error()).toBeNull();
    http.expectOne('/departments').flush([]);
    expect(service.departments()).toEqual([]);
    expect(service.loading()).toBe(false);
  });
});
