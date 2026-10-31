import { TestBed } from '@angular/core/testing';
import type { EmployeeDto } from '../employee/employee.service';
import { SalaryStructureDialog } from './salary-structure-dialog';

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

describe('SalaryStructureDialog', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [SalaryStructureDialog] }).compileComponents();
    const fixture = TestBed.createComponent(SalaryStructureDialog);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    // jsdom does not implement native dialog methods.
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    return { fixture, dialog };
  }

  it('shows the breakdown, closes, clears selection and returns focus to the trigger', async () => {
    const { fixture, dialog } = await setup();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    try {
      trigger.focus();
      fixture.componentInstance.open(alice);
      fixture.detectChanges();
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(dialog.textContent).toContain('Alice');
      expect(dialog.querySelector('tfoot')?.textContent).toContain('11,750.20');
      expect(dialog.querySelectorAll('tbody tr')).toHaveLength(4);
      expect(dialog.querySelector<HTMLButtonElement>('.download')?.disabled).toBe(false);
      dialog.querySelector<HTMLButtonElement>('.close')!.focus();
      dialog.querySelector<HTMLButtonElement>('.close')!.click();
      fixture.detectChanges();
      expect(dialog.close).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(trigger);
      expect(dialog.open).toBe(false);
      expect(dialog.textContent).not.toContain('Alice');
    } finally {
      trigger.remove();
    }
  });

  it('updates employee details and disables download when salary data is missing', async () => {
    const { fixture, dialog } = await setup();
    fixture.componentInstance.open(alice);
    fixture.detectChanges();
    fixture.componentInstance.open({ ...alice, id: 2, name: 'Bob', salaryStructureDto: null });
    fixture.detectChanges();
    expect(dialog.textContent).toContain('Bob');
    expect(dialog.textContent).not.toContain('Alice');
    expect(dialog.textContent).toContain('Salary structure not available');
    expect(dialog.querySelector('table')).toBeNull();
    expect(dialog.querySelector<HTMLButtonElement>('.download')?.disabled).toBe(true);
    expect(dialog.showModal).toHaveBeenCalledOnce();
  });
});
