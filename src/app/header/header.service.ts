import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HeaderService {
  private readonly messageState = signal<string | null>(null);
  private timeout: ReturnType<typeof setTimeout> | undefined;
  readonly notification = this.messageState.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dismissNotification());
  }

  employeeCreated(): void {
    this.showNotification('Employee Created Successfully');
  }

  employeeUpdated(): void {
    this.showNotification('Employee Updated Successfully');
  }

  employeeDeleted(): void {
    this.showNotification('Employee Deleted Successfully');
  }

  private showNotification(message: string): void {
    this.dismissNotification();
    this.messageState.set(message);
    this.timeout = setTimeout(() => this.dismissNotification(), 5000);
  }

  dismissNotification(): void {
    if (this.timeout !== undefined) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    this.messageState.set(null);
  }
}
