import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CreateEmployeeDialog } from '../create-employee-dialog/create-employee-dialog';
import { EditEmployeeDialog } from '../edit-employee-dialog/edit-employee-dialog';
import { DeleteEmployeeDialog } from '../delete-employee-dialog/delete-employee-dialog';
import { EmployeeService } from './employee.service';
import { SalaryStructureDialog } from '../salary-structure-dialog/salary-structure-dialog';

@Component({
  selector: 'app-employee',
  imports: [
    DecimalPipe,
    CreateEmployeeDialog,
    EditEmployeeDialog,
    DeleteEmployeeDialog,
    SalaryStructureDialog,
  ],
  providers: [EmployeeService],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee implements OnInit {
  protected readonly employee = inject(EmployeeService);

  ngOnInit(): void {
    this.employee.initialize();
  }
}
