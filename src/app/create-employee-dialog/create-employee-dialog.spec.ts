import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { LoginService } from '../login/login.service';

const department = { id: 7, name: 'Engineering', totalEmployees: 20 };

describe('Create employee dialog', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoginService,
          useValue: {
            authenticated: () => true,
            session: () => ({ name: 'Tester', loginTime: '2026-10-31T10:15:30Z' }),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function setup() {
    const harness = await RouterTestingHarness.create('/employee/7');
    http.expectOne('http://localhost:8080/departments').flush([department]);
    http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([]);
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const dialog = page.querySelector<HTMLDialogElement>('app-create-employee-dialog dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    const button = page.querySelector<HTMLButtonElement>('.description .new-employee')!;
    button.focus();
    button.click();
    harness.detectChanges();
    return { harness, page, dialog, button };
  }

  function fill(dialog: HTMLDialogElement, id: string, value: string) {
    const input = dialog.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it.each([200, 201])(
    'opens New without routing, then closes and shows a header popup after HTTP %s',
    async (status) => {
      const { harness, page, dialog, button } = await setup();
      expect(button.textContent?.trim()).toBe('New');
      expect(button.parentElement?.lastElementChild).toBe(button);
      expect(button.hasAttribute('routerLink')).toBe(false);
      expect(dialog.open).toBe(true);
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(TestBed.inject(Router).url).toBe('/employee/7');
      expect(dialog.querySelector<HTMLInputElement>('#employee-department')?.value).toBe(
        'Engineering',
      );
      for (const [id, value] of Object.entries({
        'employee-name': ' Alice ',
        'employee-country': 'India',
        fixedPay: '1000.10',
        variablePay: '0.20',
        bonuses: '0.30',
        deduction: '0.15',
      }))
        fill(dialog, id, value);
      harness.detectChanges();
      expect(dialog.querySelector('output')?.textContent).toBe('1000.45');
      dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      harness.detectChanges();
      expect(dialog.querySelector<HTMLButtonElement>('.close')?.disabled).toBe(true);
      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);
      expect(cancel.defaultPrevented).toBe(true);
      const post = http.expectOne('http://localhost:8080/employees');
      expect(post.request.method).toBe('POST');
      expect(post.request.body.departmentId).toBe(7);
      post.flush(null, { status, statusText: status === 201 ? 'Created' : 'OK' });
      harness.detectChanges();
      await harness.fixture.whenStable();
      expect(dialog.open).toBe(false);
      expect(document.activeElement).toBe(button);
      expect(TestBed.inject(Router).url).toBe('/employee/7');
      http
        .expectOne('http://localhost:8080/departments')
        .flush([{ ...department, totalEmployees: 21 }]);
      http.expectOne('http://localhost:8080/employees?dep_id=7&page=0&size=20').flush([]);
      harness.detectChanges();
      expect(page.textContent).toContain('21 employees');
      expect(page.textContent).toContain('Page 1 of 2');
      expect(page.querySelector('app-header .notification')?.textContent).toContain(
        'Employee Created Successfully',
      );
      page.querySelector<HTMLButtonElement>('.notification-close')!.click();
      harness.detectChanges();
      expect(page.querySelector('.notification')).toBeNull();
    },
    15000,
  );

  it('shows invalid fields and server failures without closing or notifying, then resets on Cancel', async () => {
    const { harness, page, dialog, button } = await setup();
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    harness.detectChanges();
    expect(dialog.textContent).toContain('Enter a name');
    expect(dialog.textContent).toContain('Enter a country');
    http.expectNone('http://localhost:8080/employees');
    fill(dialog, 'employee-name', 'Alice');
    fill(dialog, 'employee-country', 'India');
    dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    http
      .expectOne('http://localhost:8080/employees')
      .flush({}, { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Unable to create');
    expect(page.querySelector('.notification')).toBeNull();
    expect(dialog.querySelector<HTMLInputElement>('#employee-name')?.value).toBe('Alice');
    dialog.querySelector<HTMLButtonElement>('form button[type="button"]')!.click();
    harness.detectChanges();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(button);
    button.click();
    harness.detectChanges();
    expect(dialog.querySelector<HTMLInputElement>('#employee-name')?.value).toBe('');
    expect(dialog.textContent).not.toContain('Unable to create');
    dialog.querySelector<HTMLButtonElement>('.close')!.click();
    harness.detectChanges();
    expect(dialog.open).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/employee/7');
  });

  it('allows Escape dismissal when idle and restores focus to New', async () => {
    const { harness, dialog, button } = await setup();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(false);
    // Simulate the browser default action for Escape, which jsdom does not implement.
    dialog.close();
    harness.detectChanges();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(button);
    http.expectNone((request) => request.method === 'POST');
  });
});
