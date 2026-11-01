import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('cancels an older grouping request and displays only the latest response', () => {
    service.load();
    const first = http.expectOne(
      'http://localhost:8080/reports/salary-distribution?groupBy=department',
    );
    service.load('country');
    expect(first.cancelled).toBe(true);
    http.expectOne('http://localhost:8080/reports/salary-distribution?groupBy=country').flush({
      groupBy: 'country',
      totalSalary: 100,
      employeeCount: 1,
      missingSalaryCount: 0,
      groups: [],
    });
    expect(service.grouping()).toBe('country');
    expect(service.report()?.totalSalary).toBe(100);
    expect(service.loading()).toBe(false);
  });

  it('clears stale data on failure and supports retry', () => {
    service.load('country');
    http
      .expectOne('http://localhost:8080/reports/salary-distribution?groupBy=country')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(service.error()).toContain('Unable to load');
    expect(service.report()).toBeNull();
    expect(service.loading()).toBe(false);
    service.load();
    expect(service.error()).toBeNull();
    http
      .expectOne('http://localhost:8080/reports/salary-distribution?groupBy=country')
      .flush({
        groupBy: 'country',
        totalSalary: 0,
        employeeCount: 0,
        missingSalaryCount: 0,
        groups: [],
      });
    expect(service.report()?.groups).toEqual([]);
  });
});
