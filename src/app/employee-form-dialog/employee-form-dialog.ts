import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { EmployeeDto } from '../employee/employee.service';
import type { DepartmentDto } from '../dashboard/dashboard.service';
import { EmployeeFormDialogService } from './employee-form-dialog.service';

@Component({
  selector: 'app-employee-form-dialog',
  imports: [ReactiveFormsModule],
  providers: [EmployeeFormDialogService],
  templateUrl: './employee-form-dialog.html',
  styleUrl: './employee-form-dialog.css',
})
export class EmployeeFormDialog {
  protected readonly editor = inject(EmployeeFormDialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger: HTMLElement | null = null;
  readonly mode = input<'create' | 'edit'>('create');
  protected readonly idPrefix = computed(() => (this.mode() === 'edit' ? 'edit-' : ''));
  readonly saved = output<void>();
  protected readonly moneyFields = [
    { key: 'fixedPay', label: 'Fixed Pay' },
    { key: 'variablePay', label: 'Variable Pay' },
    { key: 'bonuses', label: 'Bonuses' },
    { key: 'deduction', label: 'Deduction' },
  ] as const;

  constructor() {
    effect(() => {
      if (this.editor.saved()) {
        this.dialog().nativeElement.close();
        this.saved.emit();
      }
    });
  }

  open(department: DepartmentDto, employee?: EmployeeDto): void {
    const element = this.dialog().nativeElement;
    if (element.open) return;
    this.editor.open(this.mode(), department, employee);
    this.trigger = element.ownerDocument.activeElement as HTMLElement | null;
    element.showModal();
  }

  protected close(): void {
    if (!this.editor.saving()) this.dialog().nativeElement.close();
  }

  protected onCancel(event: Event): void {
    if (this.editor.saving()) event.preventDefault();
  }

  protected restoreFocus(): void {
    this.editor.clear();
    this.trigger?.focus();
    this.trigger = null;
  }
}
