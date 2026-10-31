import { TestBed } from '@angular/core/testing';
import type { EmployeeDto } from '../employee/employee.service';
import { SalaryStructureDialogService } from './salary-structure-dialog.service';

const alice: EmployeeDto = {
  id: 1,
  name: 'Alice',
  departmentId: 7,
  salary: 11750.2,
  country: 'India',
  salaryStructureDto: {
    empId: 1,
    fixedPay: 10000.1,
    variablePay: 2000.25,
    bonuses: 500.3,
    deduction: 750.45,
  },
};

describe('SalaryStructureDialogService', () => {
  let service: SalaryStructureDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SalaryStructureDialogService] });
    service = TestBed.inject(SalaryStructureDialogService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exports the embedded breakdown and exact two-decimal total', () => {
    service.selectEmployee(alice);
    expect(service.total()).toBe(11750.2);
    const csv = service.createCsv()!;
    expect(csv).toContain('"Employee ID","1"\r\n');
    expect(csv).toContain('"Employee Name","Alice"\r\n');
    expect(csv).toContain('"Department ID","7"\r\n');
    expect(csv).toContain('"Country","India"\r\n');
    expect(csv).toContain('"Fixed Pay",10000.10\r\n');
    expect(csv).toContain('"Variable Pay",2000.25\r\n');
    expect(csv).toContain('"Bonuses",500.30\r\n');
    expect(csv).toContain('"Deduction",750.45\r\n');
    expect(csv).toContain('"Total Salary",11750.20\r\n');
    service.selectEmployee({
      ...alice,
      salaryStructureDto: { empId: 1, fixedPay: 0.1, variablePay: 0.2, bonuses: 0, deduction: 0 },
    });
    expect(service.total()).toBe(0.3);
  });

  it('quotes names with commas, quotes, newlines and spreadsheet formulas', () => {
    service.selectEmployee({ ...alice, name: 'Alice, "A"\nSmith', country: '=SUM(1,2)' });
    const csv = service.createCsv()!;
    expect(csv).toContain('"Employee Name","Alice, ""A""\nSmith"');
    expect(csv).toContain('"Country","\'=SUM(1,2)"');
  });

  it('clears stale data and refuses missing or mismatched structures', () => {
    service.selectEmployee(alice);
    service.selectEmployee({ ...alice, id: 2, name: 'Bob', salaryStructureDto: null });
    expect(service.structure()).toBeNull();
    expect(service.total()).toBeNull();
    expect(service.createCsv()).toBeNull();
    service.selectEmployee({ ...alice, id: 2 });
    expect(service.structure()).toBeNull();
    service.selectEmployee({
      ...alice,
      salaryStructureDto: { ...alice.salaryStructureDto!, fixedPay: NaN },
    });
    expect(service.structure()).toBeNull();
    service.clear();
    expect(service.employee()).toBeNull();
  });

  it('downloads a CSV file and releases the object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:salary-test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download;
      expect(this.href).toBe('blob:salary-test');
    });
    service.selectEmployee(alice);
    service.downloadCsv();
    expect(filename).toBe('salary-structure-1.csv');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:salary-test');
  });

  it('reports a download failure and clears it on the next selection', () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        throw new Error('Download blocked');
      }),
    });
    service.selectEmployee(alice);
    service.downloadCsv();
    expect(service.downloadError()).toContain('Unable to download');
    service.selectEmployee(alice);
    expect(service.downloadError()).toBeNull();
  });
});
