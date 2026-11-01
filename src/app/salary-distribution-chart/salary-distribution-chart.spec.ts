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
        averageSalary: 125,
        employeeCount: 2,
        missingSalaryCount: 0,
      },
    ]);
    fixture.componentRef.setInput('grouping', 'department');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(chartMocks.create).toHaveBeenCalledTimes(1));
    expect(chartMocks.create.mock.calls[0][1].options.indexAxis).toBe('y');
    const config = chartMocks.create.mock.calls[0][1];
    expect(config.data.datasets[0].label).toBe('Average salary');
    expect(config.data.datasets[0].data).toEqual([125]);
    const tooltip = config.options.plugins.tooltip.callbacks.label({ dataIndex: 0 });
    expect(tooltip[0]).toContain('Average salary:');
    expect(tooltip).toContain('Recorded salaries: 2');
    expect(tooltip.join(' ')).not.toContain('Share:');
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Engineering');
    fixture.componentRef.setInput('grouping', 'country');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(chartMocks.create).toHaveBeenCalledTimes(2));
    expect(chartMocks.destroy).toHaveBeenCalled();
    fixture.destroy();
    expect(chartMocks.destroy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('distinguishes an unavailable average from a recorded zero', async () => {
    chartMocks.create.mockClear();
    TestBed.configureTestingModule({ imports: [SalaryDistributionChart] });
    const fixture = TestBed.createComponent(SalaryDistributionChart);
    fixture.componentRef.setInput('groups', [
      {
        key: 'unknown',
        label: 'Unknown',
        averageSalary: null,
        employeeCount: 1,
        missingSalaryCount: 1,
      },
      { key: 'zero', label: 'Zero', averageSalary: 0, employeeCount: 1, missingSalaryCount: 0 },
    ]);
    fixture.componentRef.setInput('grouping', 'country');
    fixture.detectChanges();
    await fixture.whenStable();
    await vi.waitFor(() => expect(chartMocks.create).toHaveBeenCalledTimes(1));
    expect(chartMocks.create.mock.calls[0][1].data.datasets[0].data).toEqual([null, 0]);
    const table = fixture.nativeElement.querySelector('table');
    expect(table.textContent).toContain('Not available');
    expect(table.textContent).toContain('0.00');
    expect(table.textContent).not.toContain('Share');
    fixture.destroy();
  });
});
