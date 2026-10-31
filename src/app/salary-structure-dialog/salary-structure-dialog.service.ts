import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { EmployeeDto } from '../employee/employee.service';

export interface SalaryStructureDto {
  empId: number;
  fixedPay: number;
  variablePay: number;
  bonuses: number;
  deduction: number;
}

@Injectable()
export class SalaryStructureDialogService {
  private readonly document = inject(DOCUMENT);
  private readonly employeeState = signal<EmployeeDto | null>(null);
  private readonly downloadErrorState = signal<string | null>(null);

  readonly employee = this.employeeState.asReadonly();
  readonly downloadError = this.downloadErrorState.asReadonly();
  readonly structure = computed(() => {
    const employee = this.employee();
    const structure = employee?.salaryStructureDto;
    if (!structure || structure.empId !== employee?.id) return null;
    return [
      structure.fixedPay,
      structure.variablePay,
      structure.bonuses,
      structure.deduction,
    ].every((value) => typeof value === 'number' && Number.isFinite(value))
      ? structure
      : null;
  });
  readonly total = computed(() => {
    const structure = this.structure();
    if (!structure) return null;
    // Sum in cents so the displayed components and total agree to two decimal places.
    return (
      (Math.round(structure.fixedPay * 100) +
        Math.round(structure.variablePay * 100) +
        Math.round(structure.bonuses * 100) -
        Math.round(structure.deduction * 100)) /
      100
    );
  });

  selectEmployee(employee: EmployeeDto): void {
    this.employeeState.set(employee);
    this.downloadErrorState.set(null);
  }

  clear(): void {
    this.employeeState.set(null);
    this.downloadErrorState.set(null);
  }

  createCsv(): string | null {
    const employee = this.employee();
    const structure = this.structure();
    const total = this.total();
    if (!employee || !structure || total === null) return null;

    const rows: (string | number)[][] = [
      ['Field', 'Value'],
      ['Employee ID', String(employee.id)],
      ['Employee Name', employee.name],
      ['Department ID', String(employee.departmentId)],
      ['Country', employee.country],
      ['Fixed Pay', structure.fixedPay],
      ['Variable Pay', structure.variablePay],
      ['Bonuses', structure.bonuses],
      ['Deduction', structure.deduction],
      ['Total Salary', total],
    ];
    return (
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map((value) => {
              if (typeof value === 'number') return value.toFixed(2);
              // Keep employee text literal when opened by spreadsheet applications.
              const text = /^[\s]*[=+\-@]|^[\t\r\n]/.test(value) ? "'" + value : value;
              return '"' + text.replaceAll('"', '""') + '"';
            })
            .join(','),
        )
        .join('\r\n') +
      '\r\n'
    );
  }

  downloadCsv(): void {
    const csv = this.createCsv();
    const employee = this.employee();
    if (!csv || !employee) return;
    this.downloadErrorState.set(null);
    let url: string | undefined;
    const link = this.document.createElement('a');
    try {
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      link.href = url;
      link.download = `salary-structure-${employee.id}.csv`;
      this.document.body.appendChild(link);
      link.click();
    } catch {
      this.downloadErrorState.set('Unable to download the CSV. Please try again.');
    } finally {
      link.remove();
      // Allow the browser to start the download before releasing the object URL.
      if (url) {
        const downloadUrl = url;
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
    }
  }
}
