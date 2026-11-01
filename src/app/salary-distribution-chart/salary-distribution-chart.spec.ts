import { TestBed } from '@angular/core/testing';
import { SalaryDistributionChart } from './salary-distribution-chart';

const chartMocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  register: vi.fn(),
}));
vi.mock('chart.js', () => ({
  Chart: class {
    static register = chartMocks.register;
    constructor(...args: unknown[]) {
      chartMocks.create(...args);
    }
    destroy() {
      chartMocks.destroy();
    }
  },
  BarController: {},
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Tooltip: {},
}));

describe('SalaryDistributionChart', () => {
  it('renders horizontal salary bars, accessible values, and cleans up on changes', async () => {
    chartMocks.create.mockClear();
    chartMocks.destroy.mockClear();
    TestBed.configureTestingModule({ imports: [SalaryDistributionChart] });
    const fixture = TestBed.createComponent(SalaryDistributionChart);
    fixture.componentRef.setInput('groups', [
      {
        key: '7',
        label: 'Engineering',
        totalSalary: 250,
        employeeCount: 2,
        missingSalaryCount: 0,
        percentage: 100,
      },
    ]);
    fixture.componentRef.setInput('grouping', 'department');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(chartMocks.create).toHaveBeenCalledTimes(1));
    expect(chartMocks.create.mock.calls[0][1].options.indexAxis).toBe('y');
    expect(chartMocks.create.mock.calls[0][1].data.datasets[0].data).toEqual([250]);
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Engineering');
    fixture.componentRef.setInput('grouping', 'country');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(chartMocks.create).toHaveBeenCalledTimes(2));
    expect(chartMocks.destroy).toHaveBeenCalled();
    fixture.destroy();
    expect(chartMocks.destroy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
