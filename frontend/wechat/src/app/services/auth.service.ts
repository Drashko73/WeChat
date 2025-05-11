import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    profile_pic_path: string | null;
  }
}

export interface EmailVerificationResponse {
  message: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  profilePicPath: string | null;
  emailVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if user is already logged in from localStorage
    this.loadUserFromStorage();
  }
  
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Register a new user with optional profile picture
   * 
   * @param userData User registration data
   * @param profilePic Optional profile picture file
   */
  register(userData: {
    fullName: string,
    email: string,
    username: string,
    password: string
  }, profilePic?: File): Observable<RegisterResponse> {
    const formData = new FormData();
    
    formData.append('full_name', userData.fullName);
    formData.append('email', userData.email);
    formData.append('username', userData.username);
    formData.append('password', userData.password);
    
    if (profilePic) {
      formData.append('profile_pic', profilePic);
    }

    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/register`, formData);
  }

  /**
   * Sends a verification code to the user's email
   * 
   * @param email User's email address
   */
  sendVerificationCode(email: string): Observable<EmailVerificationResponse> {
    return this.http.post<EmailVerificationResponse>(
      `${this.apiUrl}/auth/send-verification`, 
      { email }
    );
  }

  /**
   * Confirms a user's email address with verification code
   * 
   * @param email User's email address
   * @param verificationCode Code received via email
   */
  confirmEmail(email: string, verificationCode: string): Observable<EmailVerificationResponse> {
    return this.http.post<EmailVerificationResponse>(
      `${this.apiUrl}/auth/confirm-email`, 
      { email, verification_code: verificationCode }
    ).pipe(
      tap(() => {
        // If user is logged in, update their email verification status
        const currentUser = this.currentUserSubject.value;
        if (currentUser && currentUser.email === email) {
          currentUser.emailVerified = true;
          this.currentUserSubject.next(currentUser);
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      })
    );
  }
  
  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }
  
  /**
   * Check if the current user's email is verified
   */
  isEmailVerified(): boolean {
    const currentUser = this.currentUserSubject.value;
    return !!currentUser?.emailVerified;
  }
  
  /**
   * Get the current user's email
   */
  getCurrentUserEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }
  
  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
