import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core/primitives/di";
import { DepartmentDto } from "../dashboard/dashboard.service";
import { Observable } from "rxjs";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class ControllerService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080';

    getAllDepartments(): Observable<DepartmentDto[]> {
        return this.http.get<DepartmentDto[]>(`${this.baseUrl}/departments`);
    }
}