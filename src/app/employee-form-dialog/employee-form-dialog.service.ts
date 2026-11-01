import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { HeaderService } from '../header/header.service';
import { Subject, finalize, takeUntil } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { DashboardService, DepartmentDto } from '../dashboard/dashboard.service';
import type { EmployeeDto } from '../employee/employee.service';

export interface EmployeeWriteRequest {
  name: string;
  country: string;
  departmentId: number;
  salaryStructureDto: {
    fixedPay: string;
    variablePay: string;
    bonuses: string;
    deduction: string;
  };
}

const moneyPattern = /^\d{1,36}(?:\.\d{1,2})?$/;
const maxCents = 10n ** 38n - 1n;

function cents(value: string): bigint | null {
  if (!moneyPattern.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function amount(value: bigint): string {
  const positive = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${positive / 100n}.${String(positive % 100n).padStart(2, '0')}`;
}

function inputAmount(value: number | undefined): string {
  return value !== undefined && Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        useGrouping: false,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '';
}

@Injectable()
export class EmployeeFormDialogService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly header = inject(HeaderService);
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly departmentChanges = new Subject<void>();
  private readonly departmentState = signal<DepartmentDto | null>(null);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly savedState = signal(false);
  private readonly modeState = signal<'create' | 'edit'>('create');
  private readonly employeeState = signal<EmployeeDto | null>(null);

  readonly department = this.departmentState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly saved = this.savedState.asReadonly();
  readonly editing = computed(() => this.modeState() === 'edit');
  readonly unavailable = computed(
    () =>
      this.editing() &&
      (!this.employeeState()?.salaryStructureDto ||
        !Number.isSafeInteger(this.employeeState()?.id) ||
        (this.employeeState()?.id ?? 0) < 1 ||
        this.employeeState()?.departmentId !== this.department()?.id),
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    country: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    fixedPay: ['0.00', [Validators.required, Validators.pattern(moneyPattern)]],
    variablePay: ['0.00', [Validators.required, Validators.pattern(moneyPattern)]],
    bonuses: ['0.00', [Validators.required, Validators.pattern(moneyPattern)]],
    deduction: ['0.00', [Validators.required, Validators.pattern(moneyPattern)]],
  });
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  private readonly totalCents = computed(() => {
    const values = this.values();
    const fixed = cents(values.fixedPay ?? '');
    const variable = cents(values.variablePay ?? '');
    const bonuses = cents(values.bonuses ?? '');
    const deduction = cents(values.deduction ?? '');
    return fixed === null || variable === null || bonuses === null || deduction === null
      ? null
      : fixed + variable + bonuses - deduction;
  });
  readonly total = computed(() => {
    const total = this.totalCents();
    return total === null ? null : amount(total);
  });
  readonly totalError = computed(() => {
    const total = this.totalCents();
    return total !== null && total < 0n
      ? 'Deduction cannot exceed Fixed Pay + Variable Pay + Bonuses.'
      : total !== null && total > maxCents
        ? 'Total salary must have at most 36 integer digits.'
        : null;
  });

  open(mode: 'create' | 'edit', department: DepartmentDto, employee?: EmployeeDto): void {
    this.departmentChanges.next();
    this.form.reset();
    this.errorState.set(null);
    this.savedState.set(false);
    this.departmentState.set(department);
    this.modeState.set(mode);
    this.employeeState.set(employee ?? null);
    if (mode === 'edit' && employee) {
      const structure = employee.salaryStructureDto;
      this.form.reset({
        name: employee.name,
        country: employee.country,
        fixedPay: inputAmount(structure?.fixedPay),
        variablePay: inputAmount(structure?.variablePay),
        bonuses: inputAmount(structure?.bonuses),
        deduction: inputAmount(structure?.deduction),
      });
    }
    if (this.unavailable()) {
      this.errorState.set(
        'Employee details or salary structure are unavailable. Refresh the employee list and try again.',
      );
    }
  }

  clear(): void {
    this.departmentChanges.next();
    this.departmentState.set(null);
    this.employeeState.set(null);
    this.form.reset();
    this.errorState.set(null);
    this.savedState.set(false);
  }
  submit(): void {
    if (this.saving() || this.saved() || this.unavailable()) return;
    this.form.markAllAsTouched();
    const department = this.department();
    if (!department || this.form.invalid || this.totalError() || this.total() === null) return;
    const values = this.form.getRawValue();
    // Decimal strings preserve BigDecimal precision, including values above JavaScript's safe integer limit.
    const request: EmployeeWriteRequest = {
      name: values.name.trim(),
      country: values.country.trim(),
      departmentId: department.id,
      salaryStructureDto: {
        fixedPay: amount(cents(values.fixedPay)!),
        variablePay: amount(cents(values.variablePay)!),
        bonuses: amount(cents(values.bonuses)!),
        deduction: amount(cents(values.deduction)!),
      },
    };
    this.savingState.set(true);
    this.errorState.set(null);
    const editing = this.editing();
    const operation = editing
      ? this.http.put<EmployeeDto>(
          `${this.apiBaseUrl}/employees/${this.employeeState()!.id}`,
          request,
        )
      : this.http.post<EmployeeDto>(`${this.apiBaseUrl}/employees`, request);
    operation
      .pipe(
        takeUntil(this.departmentChanges),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingState.set(false)),
      )
      .subscribe({
        next: () => {
          this.savedState.set(true);
          this.dashboard.invalidateDepartments();
          if (editing) this.header.employeeUpdated();
          else this.header.employeeCreated();
        },
        error: (error: HttpErrorResponse) => {
          this.errorState.set(
            error.status === 404
              ? editing
                ? 'The employee, salary structure, or department no longer exists. Refresh the employee list and try again.'
                : 'The department no longer exists. Please choose a department from Home.'
              : error.status === 400
                ? 'The employee could not be saved. Check the fields and salary amounts.'
                : error.status === 401
                  ? 'Your session has expired. Please sign in again.'
                  : editing
                    ? 'Unable to update the employee. Please try again.'
                    : 'Unable to create the employee. Please try again.',
          );
        },
      });
  }
}
