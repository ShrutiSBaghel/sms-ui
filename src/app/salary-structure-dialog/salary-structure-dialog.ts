import { Component, ElementRef, viewChild } from '@angular/core';

@Component({
  selector: 'app-salary-structure-dialog',
  imports: [],
  templateUrl: './salary-structure-dialog.html',
  styleUrl: './salary-structure-dialog.css',
})
export class SalaryStructureDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private trigger: HTMLElement | null = null;

  open(): void {
    const element = this.dialog().nativeElement;
    if (element.open) return;
    this.trigger = element.ownerDocument.activeElement as HTMLElement | null;
    element.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected restoreFocus(): void {
    this.trigger?.focus();
    this.trigger = null;
  }
}
