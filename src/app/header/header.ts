import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Login } from '../login/login';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, Login],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {}
