import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { fadeIn } from '../../animations/animations';
import { Observable } from 'rxjs';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  animations: [fadeIn]
})
export class DashboardComponent {
  currentUser$: Observable<User | null>;
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser;
  }
  
  logout(): void {
    this.authService.logout();
  }
}
