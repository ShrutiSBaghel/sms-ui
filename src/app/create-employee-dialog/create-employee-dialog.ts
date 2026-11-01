import { Component, output, viewChild } from '@angular/core';
import type { DepartmentDto } from '../dashboard/dashboard.service';
import { EmployeeFormDialog } from '../employee-form-dialog/employee-form-dialog';

@Component({
  selector: 'app-create-employee-dialog',
  imports: [EmployeeFormDialog],
  templateUrl: './create-employee-dialog.html',
})
export class CreateEmployeeDialog {
  private readonly dialog = viewChild.required<EmployeeFormDialog>('dialog');
  readonly created = output<void>();

  open(department: DepartmentDto): void {
    this.dialog().open(department);
  }
}
