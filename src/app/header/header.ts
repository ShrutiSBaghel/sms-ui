import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LoginService } from '../login/login.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '(document:click)': 'closeProfileOutside($event)',
    '(document:keydown.escape)': 'closeProfile()',
  },
})
export class Header {
  protected readonly login = inject(LoginService);
  private readonly profile = viewChild.required<ElementRef<HTMLDetailsElement>>('profile');

  protected closeProfileOutside(event: MouseEvent): void {
    const profile = this.profile().nativeElement;
    if (profile.open && !event.composedPath().includes(profile)) {
      profile.open = false;
    }
  }

  protected closeProfile(): void {
    const profile = this.profile().nativeElement;
    if (profile.open) {
      profile.open = false;
      profile.querySelector('summary')?.focus();
    }
  }
}
