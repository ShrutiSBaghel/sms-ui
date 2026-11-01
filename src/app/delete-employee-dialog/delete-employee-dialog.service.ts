import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, finalize, takeUntil } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { DashboardService } from '../dashboard/dashboard.service';
import type { EmployeeDto } from '../employee/employee.service';
import { HeaderService } from '../header/header.service';

@Injectable()
export class DeleteEmployeeDialogService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly dashboard = inject(DashboardService);
  private readonly header = inject(HeaderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resets = new Subject<void>();
  private readonly employeeState = signal<EmployeeDto | null>(null);
  private readonly deletingState = signal(false);
  private readonly deletedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly employee = this.employeeState.asReadonly();
  readonly deleting = this.deletingState.asReadonly();
  readonly deleted = this.deletedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  open(employee: EmployeeDto): void {
    this.clear();
    this.employeeState.set(employee);
  }

  clear(): void {
    this.resets.next();
    this.employeeState.set(null);
    this.deletedState.set(false);
    this.errorState.set(null);
  }

  confirm(): void {
    const employee = this.employee();
    if (!employee || this.deleting() || this.deleted()) return;
    this.deletingState.set(true);
    this.errorState.set(null);
    this.http
      .delete(`${this.apiBaseUrl}/employees/${employee.id}`)
      .pipe(
        takeUntil(this.resets),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingState.set(false)),
      )
      .subscribe({
        next: () => {
          this.deletedState.set(true);
          this.dashboard.invalidateDepartments();
          this.header.employeeDeleted();
        },
        error: (error: HttpErrorResponse) =>
          this.errorState.set(
            error.status === 404
              ? 'This employee no longer exists. Close the dialog and refresh the employee list.'
              : error.status === 401
                ? 'Your session has expired. Please sign in again.'
                : 'Unable to delete the employee. Please try again.',
          ),
      });
  }
}
