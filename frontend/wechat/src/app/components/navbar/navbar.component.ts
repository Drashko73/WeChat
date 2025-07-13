import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { ProfilePictureComponent } from '../profile-picture/profile-picture.component';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, ThemeToggleComponent, ProfilePictureComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  animations: [
    trigger('dropdownAnimation', [
      state('open', style({
        height: '*',
        opacity: 1,
        visibility: 'visible'
      })),
      state('closed', style({
        height: '0',
        opacity: 0,
        visibility: 'hidden'
      })),
      transition('closed => open', [
        animate('300ms ease-in-out')
      ]),
      transition('open => closed', [
        animate('200ms ease-in-out')
      ])
    ]),
    trigger('rotateAnimation', [
      state('open', style({
        transform: 'rotate(180deg)'
      })),
      state('closed', style({
        transform: 'rotate(0deg)'
      })),
      transition('closed <=> open', [
        animate('200ms ease-in-out')
      ])
    ]),
    trigger('userDropdownAnimation', [
      state('open', style({
        opacity: 1,
        transform: 'translateY(0)',
        visibility: 'visible'
      })),
      state('closed', style({
        opacity: 0,
        transform: 'translateY(-10px)',
        visibility: 'hidden'
      })),
      transition('closed => open', [
        animate('200ms ease-out')
      ]),
      transition('open => closed', [
        animate('150ms ease-in')
      ])
    ])
  ]
})
export class NavbarComponent {
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  
  constructor(public authService: AuthService) {}
  
  // Use the currentUser observable from AuthService
  get currentUser$() {
    return this.authService.currentUser;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Close user menu if it's open
    if (this.isMobileMenuOpen && this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }
  
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }
  
  logout(): void {
    this.authService.logout();
    this.isUserMenuOpen = false;
    this.isMobileMenuOpen = false;
  }
}
