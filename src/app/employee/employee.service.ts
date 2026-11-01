import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, of, startWith, switchMap, tap } from 'rxjs';
import { DashboardService, DepartmentDto } from '../dashboard/dashboard.service';
import type { SalaryStructureDto } from '../salary-structure-dialog/salary-structure-dialog.service';

export interface EmployeeDto {
  id: number;
  name: string;
  departmentId: number;
  salary: number;
  country: string;
  salaryStructureDto: SalaryStructureDto | null;
}

@Injectable()
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly route = inject(ActivatedRoute);
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageRequests = new Subject<{ page: number; refreshDepartment: boolean }>();
  private lastRequest = { page: 0, refreshDepartment: false };
  private readonly employeeState = signal<EmployeeDto[]>([]);
  private readonly departmentState = signal<DepartmentDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly pageState = signal(0);

  readonly employees = this.employeeState.asReadonly();
  readonly department = this.departmentState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly pageSize = 20;
  readonly totalPages = computed(() =>
    Math.ceil((this.department()?.totalEmployees ?? 0) / this.pageSize),
  );
  readonly canPrevious = computed(() => !this.loading() && this.page() > 0);
  readonly canNext = computed(
    () => !this.loading() && !this.error() && this.page() + 1 < this.totalPages(),
  );

  initialize(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const rawId = params.get('departmentId');
          const departmentId = Number(rawId);
          this.departmentState.set(null);
          this.employeeState.set([]);
          this.pageState.set(0);
          this.errorState.set(null);
          this.loadingState.set(false);

          if (
            !rawId ||
            !/^\d+$/.test(rawId) ||
            !Number.isSafeInteger(departmentId) ||
            departmentId < 1
          ) {
            this.errorState.set('Invalid department. Please select a department from Home.');
            return EMPTY;
          }

          return this.pageRequests.pipe(
            startWith({ page: 0, refreshDepartment: false }),
            switchMap((request) => {
              this.lastRequest = request;
              const { page, refreshDepartment } = request;
              this.pageState.set(page);
              this.loadingState.set(true);
              this.errorState.set(null);
              this.employeeState.set([]);
              const cached = refreshDepartment
                ? undefined
                : (this.department() ??
                  this.dashboard
                    .departments()
                    .find((department) => department.id === departmentId));
              const departments = cached
                ? of([cached])
                : this.http.get<DepartmentDto[]>(`${this.apiBaseUrl}/departments`);

              return forkJoin({
                departments,
                employees: this.http.get<EmployeeDto[]>(`${this.apiBaseUrl}/employees`, {
                  params: { dep_id: departmentId, page, size: this.pageSize },
                }),
              }).pipe(
                tap((result) => {
                  const department = result.departments.find((item) => item.id === departmentId);
                  if (!department) {
                    this.errorState.set(
                      'Department not found. Please select a department from Home.',
                    );
                  } else {
                    this.departmentState.set(department);
                    const lastPage = Math.max(
                      0,
                      Math.ceil(department.totalEmployees / this.pageSize) - 1,
                    );
                    if (page > lastPage) {
                      this.pageRequests.next({ page: lastPage, refreshDepartment: false });
                      return;
                    }
                    this.employeeState.set(result.employees);
                  }
                  this.loadingState.set(false);
                }),
                catchError(() => {
                  this.errorState.set('Unable to load employees. Please try again.');
                  this.loadingState.set(false);
                  return EMPTY;
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  previousPage(): void {
    if (this.canPrevious())
      this.pageRequests.next({ page: this.page() - 1, refreshDepartment: false });
  }

  nextPage(): void {
    if (this.canNext()) this.pageRequests.next({ page: this.page() + 1, refreshDepartment: false });
  }

  retry(): void {
    if (!this.loading()) this.pageRequests.next(this.lastRequest);
  }

  refresh(): void {
    this.pageRequests.next({ page: this.page(), refreshDepartment: true });
  }
}
