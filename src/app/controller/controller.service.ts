import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api.config';
import { DepartmentDto } from '../dashboard/dashboard.service';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ControllerService {
  private http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAllDepartments(): Observable<DepartmentDto[]> {
    return this.http.get<DepartmentDto[]>(`${this.baseUrl}/departments`);
  }
}
