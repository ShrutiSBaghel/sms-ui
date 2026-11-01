import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { SalaryDistributionChart } from '../salary-distribution-chart/salary-distribution-chart';
import { ReportService } from './report.service';

@Component({
  selector: 'app-report',
  imports: [DecimalPipe, SalaryDistributionChart],
  providers: [ReportService],
  templateUrl: './report.html',
  styleUrl: './report.css',
})
export class Report implements OnInit {
  protected readonly report = inject(ReportService);

  ngOnInit(): void {
    this.report.load();
  }
}
