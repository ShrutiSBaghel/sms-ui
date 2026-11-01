import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControllerService } from '../controller/controller.service';

export interface DepartmentDto {
  id: number;
  name: string;
  totalEmployees: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly departmentState = signal<DepartmentDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly departments = this.departmentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  controller = inject(ControllerService);

  invalidateDepartments(): void {
    this.departmentState.set([]);
  }

  loadDepartments(): void {
    if (this.loadingState()) return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.controller
      .getAllDepartments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (departments) => {
          this.departmentState.set(departments);
          this.loadingState.set(false);
        },
        error: () => {
          this.errorState.set('Unable to load departments. Please try again.');
          this.loadingState.set(false);
        },
      });
  }
}
