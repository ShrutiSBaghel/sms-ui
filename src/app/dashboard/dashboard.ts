import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  protected readonly dashboard = inject(DashboardService);

  ngOnInit(): void {
    this.dashboard.loadDepartments();
  }
}
