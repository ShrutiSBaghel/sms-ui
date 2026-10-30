import { TestBed } from '@angular/core/testing';
import { SalaryStructureDialog } from './salary-structure-dialog';

describe('SalaryStructureDialog', () => {
  it('opens a modal, closes it, and returns focus to its trigger', async () => {
    await TestBed.configureTestingModule({ imports: [SalaryStructureDialog] }).compileComponents();
    const fixture = TestBed.createComponent(SalaryStructureDialog);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    // jsdom does not implement the browser's native dialog methods.
    const showModal = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    dialog.showModal = showModal;
    dialog.close = close;
    try {
      trigger.focus();
      fixture.componentInstance.open();
      expect(showModal).toHaveBeenCalledOnce();
      dialog.querySelector('button')!.focus();
      dialog.querySelector('button')!.click();
      expect(close).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(trigger);
      expect(dialog.open).toBe(false);
    } finally {
      trigger.remove();
    }
  });
});
