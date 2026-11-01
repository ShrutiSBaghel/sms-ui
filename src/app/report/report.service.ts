import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, switchMap, tap } from 'rxjs';

export type ReportGrouping = 'department' | 'country';
export interface SalaryGroup {
  key: string;
  label: string;
  totalSalary: number;
  employeeCount: number;
  missingSalaryCount: number;
  percentage: number;
}
export interface SalaryDistribution {
  groupBy: ReportGrouping;
  totalSalary: number;
  employeeCount: number;
  missingSalaryCount: number;
  groups: SalaryGroup[];
}

@Injectable()
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<ReportGrouping>();
  readonly grouping = signal<ReportGrouping>('department');
  readonly report = signal<SalaryDistribution | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.requests
      .pipe(
        switchMap((groupBy) => {
          this.loading.set(true);
          this.error.set(null);
          this.report.set(null);
          return this.http
            .get<SalaryDistribution>(`${this.apiBaseUrl}/reports/salary-distribution`, {
              params: { groupBy },
            })
            .pipe(
              tap((report) => {
                this.report.set(report);
                this.loading.set(false);
              }),
              catchError(() => {
                this.error.set('Unable to load salary distribution. Please try again.');
                this.loading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  load(grouping: string = this.grouping()): void {
    if (grouping !== 'department' && grouping !== 'country') return;
    this.grouping.set(grouping);
    this.requests.next(grouping);
  }
}
