import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import type { EmployeeDto } from '../employee/employee.service';
import { SalaryStructureDialogService } from './salary-structure-dialog.service';

@Component({
  selector: 'app-salary-structure-dialog',
  imports: [DecimalPipe],
  providers: [SalaryStructureDialogService],
  templateUrl: './salary-structure-dialog.html',
  styleUrl: './salary-structure-dialog.css',
})
export class SalaryStructureDialog {
  protected readonly salary = inject(SalaryStructureDialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger: HTMLElement | null = null;

  open(employee: EmployeeDto): void {
    this.salary.selectEmployee(employee);
    const element = this.dialog().nativeElement;
    if (element.open) return;
    this.trigger = element.ownerDocument.activeElement as HTMLElement | null;
    element.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected restoreFocus(): void {
    this.salary.clear();
    this.trigger?.focus();
    this.trigger = null;
  }
}
