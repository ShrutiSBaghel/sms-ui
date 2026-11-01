import { Component, output, viewChild } from '@angular/core';
import type { DepartmentDto } from '../dashboard/dashboard.service';
import type { EmployeeDto } from '../employee/employee.service';
import { EmployeeFormDialog } from '../employee-form-dialog/employee-form-dialog';

@Component({
  selector: 'app-edit-employee-dialog',
  imports: [EmployeeFormDialog],
  templateUrl: './edit-employee-dialog.html',
})
export class EditEmployeeDialog {
  private readonly dialog = viewChild.required<EmployeeFormDialog>('dialog');
  readonly updated = output<void>();

  open(employee: EmployeeDto, department: DepartmentDto | null): void {
    if (department) this.dialog().open(department, employee);
  }
}
