import { Component, ElementRef, effect, inject, output, viewChild } from '@angular/core';
import type { EmployeeDto } from '../employee/employee.service';
import { DeleteEmployeeDialogService } from './delete-employee-dialog.service';

@Component({
  selector: 'app-delete-employee-dialog',
  providers: [DeleteEmployeeDialogService],
  templateUrl: './delete-employee-dialog.html',
  styleUrl: './delete-employee-dialog.css',
})
export class DeleteEmployeeDialog {
  protected readonly deletion = inject(DeleteEmployeeDialogService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger: HTMLElement | null = null;
  readonly deleted = output<void>();

  constructor() {
    effect(() => {
      if (this.deletion.deleted()) {
        this.dialog().nativeElement.close();
        this.deleted.emit();
      }
    });
  }

  open(employee: EmployeeDto): void {
    const element = this.dialog().nativeElement;
    if (element.open) return;
    this.deletion.open(employee);
    this.trigger = element.ownerDocument.activeElement as HTMLElement | null;
    element.showModal();
  }

  protected close(): void {
    if (!this.deletion.deleting()) this.dialog().nativeElement.close();
  }

  protected onCancel(event: Event): void {
    if (this.deletion.deleting()) event.preventDefault();
  }

  protected restoreFocus(): void {
    this.deletion.clear();
    this.trigger?.focus();
    this.trigger = null;
  }
}
