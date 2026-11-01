import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Report } from './report';
import { SalaryDistributionChart } from '../salary-distribution-chart/salary-distribution-chart';

describe('Report', () => {
  it('loads department totals, changes grouping, and offers retry for failures', async () => {
    TestBed.configureTestingModule({
      imports: [Report],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    // Chart rendering is covered separately; this test exercises the page and HTTP flow.
    TestBed.overrideComponent(SalaryDistributionChart, { set: { template: '' } });
    const fixture = TestBed.createComponent(Report);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading salary');
    http
      .expectOne('http://localhost:8080/reports/salary-distribution?groupBy=department')
      .flush({
        groupBy: 'department',
        totalSalary: 0,
        employeeCount: 0,
        missingSalaryCount: 0,
        groups: [],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No employees');
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'country';
    select.dispatchEvent(new Event('change'));
    http
      .expectOne('http://localhost:8080/reports/salary-distribution?groupBy=country')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Unable to load',
    );
    fixture.nativeElement.querySelector('button').click();
    http
      .expectOne('http://localhost:8080/reports/salary-distribution?groupBy=country')
      .flush({
        groupBy: 'country',
        totalSalary: 0,
        employeeCount: 0,
        missingSalaryCount: 0,
        groups: [],
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('country');
    http.verify();
  });
});
