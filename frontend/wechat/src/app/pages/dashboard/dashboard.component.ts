import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { fadeIn } from '../../animations/animations';
import { Observable } from 'rxjs';
import { User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProfilePictureComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  animations: [fadeIn]
})
export class DashboardComponent {
  currentUser$: Observable<User | null>;
  protectedRouteText: string = "";
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.currentUser$ = this.authService.currentUser;
  }
  
  logout(): void {
    this.authService.logout();
  }

  protectedRouteCall(): void {
    this.http.get(environment.apiUrl + '/protected/test').subscribe({
      next: (response) => {
        this.protectedRouteText = JSON.stringify(response);
      },
      error: (error) => {
        console.error('Error fetching protected route:', error);
        this.protectedRouteText = 'Error fetching protected route';
      }
    });
  }
}
