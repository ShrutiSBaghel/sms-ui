import { LoginService } from '../login/login.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Header } from './header';
import { HeaderService } from './header.service';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        {
          provide: LoginService,
          useValue: {
            authenticated: () => true,
            session: () => ({ name: 'Tester', loginTime: '2026-10-31T10:15:30Z' }),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('closes Profile on an outside click while preserving clicks inside the panel', () => {
    const profile = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    profile.querySelector('summary')!.click();
    expect(profile.open).toBe(true);
    profile.querySelector<HTMLElement>('.profile-name')!.click();
    expect(profile.open).toBe(true);
    document.body.click();
    expect(profile.open).toBe(false);
  });

  it('closes Profile with Escape and returns focus to the profile control', () => {
    const profile = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    const summary = profile.querySelector('summary')!;
    summary.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(profile.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });

  it('shows the success popup for five seconds and restarts its timeout for a newer success', () => {
    vi.useFakeTimers();
    try {
      const header = TestBed.inject(HeaderService);
      header.employeeCreated();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notification')?.textContent).toContain(
        'Employee Created Successfully',
      );
      vi.advanceTimersByTime(4000);
      header.employeeUpdated();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notification')?.textContent).toContain(
        'Employee Updated Successfully',
      );
      vi.advanceTimersByTime(4999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notification')).not.toBeNull();
      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notification')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismisses the notification using its close icon and cancels its timer', () => {
    vi.useFakeTimers();
    try {
      TestBed.inject(HeaderService).employeeCreated();
      fixture.detectChanges();
      fixture.nativeElement.querySelector('.notification-close').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notification')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears notification state when the header is destroyed', () => {
    vi.useFakeTimers();
    try {
      const header = TestBed.inject(HeaderService);
      header.employeeCreated();
      fixture.destroy();
      expect(header.notification()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
