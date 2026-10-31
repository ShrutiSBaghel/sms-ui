import { LoginService } from '../login/login.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Header } from './header';

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
});
