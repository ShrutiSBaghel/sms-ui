import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EmployeeFormDialog } from './employee-form-dialog';
import type { EmployeeDto } from '../employee/employee.service';

const department = { id: 7, name: 'Engineering', totalEmployees: 1 };
const alice: EmployeeDto = {
  id: 1,
  name: 'Alice',
  country: 'India',
  departmentId: 7,
  salary: 100,
  salaryStructureDto: { empId: 1, fixedPay: 100, variablePay: 0, bonuses: 0, deduction: 0 },
};

describe('Shared employee form dialog', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [EmployeeFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup(mode: 'create' | 'edit') {
    const fixture = TestBed.createComponent(EmployeeFormDialog);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    return { fixture, dialog };
  }

  it('keeps form instances independent and gives create and edit fields unique label targets', () => {
    const create = setup('create');
    const edit = setup('edit');
    create.fixture.componentInstance.open(department);
    edit.fixture.componentInstance.open(department, alice);
    create.fixture.detectChanges();
    edit.fixture.detectChanges();
    const name = create.dialog.querySelector<HTMLInputElement>('#employee-name')!;
    name.value = 'New Draft';
    name.dispatchEvent(new Event('input'));
    expect(edit.dialog.querySelector<HTMLInputElement>('#edit-employee-name')?.value).toBe('Alice');
    const ids = [
      ...create.dialog.querySelectorAll('[id]'),
      ...edit.dialog.querySelectorAll('[id]'),
    ].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(edit.dialog.querySelector('label')?.htmlFor).toBe('edit-employee-name');
    expect(edit.dialog.getAttribute('aria-labelledby')).toBe('edit-title');
  });

  it('shows missing salary data and disables saving instead of initializing an edit with zero salary', () => {
    const { fixture, dialog } = setup('edit');
    fixture.componentInstance.open(department, { ...alice, salaryStructureDto: null });
    fixture.detectChanges();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('unavailable');
    expect(dialog.querySelector<HTMLInputElement>('#edit-fixedPay')?.value).toBe('');
    expect(dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
