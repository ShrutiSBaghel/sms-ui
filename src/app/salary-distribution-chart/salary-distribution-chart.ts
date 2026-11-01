import { DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { Chart } from 'chart.js';
import type { ReportGrouping, SalaryGroup } from '../report/report.service';

@Component({
  selector: 'app-salary-distribution-chart',
  imports: [DecimalPipe],
  templateUrl: './salary-distribution-chart.html',
  styleUrl: './salary-distribution-chart.css',
})
export class SalaryDistributionChart {
  readonly groups = input.required<SalaryGroup[]>();
  readonly grouping = input.required<ReportGrouping>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart<'bar'>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
    // Render effects run only in the browser, keeping canvas access safe with SSR.
    afterRenderEffect((onCleanup) => {
      const groups = this.groups();
      const grouping = this.grouping();
      const canvas = this.canvas().nativeElement;
      let active = true;
      onCleanup(() => {
        active = false;
        this.chart?.destroy();
        this.chart = undefined;
      });
      void import('chart.js').then(
        ({ Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip }) => {
          if (!active) return;
          Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);
          this.chart = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: groups.map((group) => group.label),
              datasets: [
                {
                  label: 'Average salary',
                  data: groups.map((group) => group.averageSalary),
                  backgroundColor: '#5278cc',
                  borderRadius: 5,
                  maxBarThickness: 36,
                },
              ],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              scales: {
                x: {
                  beginAtZero: true,
                  title: { display: true, text: 'Average salary (recorded amounts)' },
                },
                y: {
                  grid: { display: false },
                  title: { display: true, text: grouping === 'country' ? 'Country' : 'Department' },
                },
              },
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const group = groups[context.dataIndex];
                      return [
                        `Average salary: ${group.averageSalary === null ? 'Not available' : group.averageSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `Employees: ${group.employeeCount}`,
                        `Recorded salaries: ${group.employeeCount - group.missingSalaryCount}`,
                        `Missing salaries: ${group.missingSalaryCount}`,
                      ];
                    },
                  },
                },
              },
            },
          });
        },
      );
    });
  }
}
