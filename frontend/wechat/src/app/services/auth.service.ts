import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';

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

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
}

export interface EmailVerificationResponse {
  message: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  emailConfirmed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
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
    private router: Router,
    private tokenService: TokenService
  ) {
    // Check if user is already logged in from localStorage
    this.loadUserFromStorage();
    
    // Initialize device ID if not already present
    this.initDeviceId();
  }
  
  /**
   * Initializes a unique device identifier
   * Generates a new one if not already stored
   */
  private initDeviceId(): void {
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      // Generate UUID v4
      deviceId = this.generateUUID();
      localStorage.setItem('device_id', deviceId);
    }
  }
  
  /**
   * Generate a UUID v4 string
   * Used for device identification
   */
  private generateUUID(): string {
    // Implementation based on RFC4122 version 4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
    } else if (this.tokenService.hasAccessToken()) {
      // If token exists but no user info, try to extract user from the token
      const token = this.tokenService.getAccessToken();
      if (token) {
        const user = this.parseJwt(token);
        if (user) {
          const userInfo: User = {
            id: user.sub || user.user_id || '',
            email: user.email || '',
            username: user.username || '',
            fullName: user.full_name || user.name || '',
            emailConfirmed: user.email_verified || false,
            isDeleted: user.is_deleted || false,
            createdAt: user.created_at || '',
            updatedAt: user.updated_at || ''
          };
          
          this.currentUserSubject.next(userInfo);
        }
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
   * Login a user with email and password.
   * Stores access and refresh tokens in localStorage on success.
   * 
   * @param email User's email address
   * @param password User's password
   * @param rememberMe Whether to remember the login
   */
  login(email: string, password: string, rememberMe: boolean = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        // Store tokens using TokenService
        this.tokenService.setAccessToken(response.access_token);
        this.tokenService.setRefreshToken(response.refresh_token);
        
        // Extract user info from JWT token
        const user = this.parseJwt(response.access_token);
        if (user) {
          const userInfo: User = {
            id: user.sub || user.user_id || user._id || '',
            email: user.email || '',
            username: user.username || '',
            fullName: user.full_name || user.name || '',
            emailConfirmed: user.email_confirmed || false,
            isDeleted: user.is_deleted || false,
            createdAt: user.created_at || '',
            updatedAt: user.updated_at || ''
          };

          // Save to BehaviorSubject
          this.currentUserSubject.next(userInfo);
          
          // Save to localStorage if rememberMe is true
          if (rememberMe) {
            localStorage.setItem('currentUser', JSON.stringify(userInfo));
          } else {
            // Only save in memory, not in localStorage
            localStorage.removeItem('currentUser');
          }
        }
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return of({
          message: error.error?.message || 'Login failed',
          access_token: '',
          refresh_token: ''
        });
      })
    );
  }
  
  /**
   * Parses a JWT token and returns the payload
   * 
   * @param token JWT token string
   */
  private parseJwt(token: string): any {
    try {
      // Split the token and get the payload part
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing JWT token', e);
      return null;
    }
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
          currentUser.emailConfirmed = true;
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
    // Check for valid token
    if (!this.tokenService.hasAccessToken()) return false;
    
    // Check if token is expired
    if (this.tokenService.isTokenExpired()) {
      // If the token is expired and we have a refresh token, we consider the user still authenticated
      // The interceptor will handle token refreshing when needed
      return !!this.tokenService.getRefreshToken();
    }
    
    return !!this.currentUserSubject.value;
  }
  
  /**
   * Check if the current user's email is verified
   */
  isEmailVerified(): boolean {
    const currentUser = this.currentUserSubject.value;
    return !!currentUser?.emailConfirmed;
  }
  
  /**
   * Get the current user's email
   */
  getCurrentUserEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }
  
  /**
   * Get the device ID
   */
  getDeviceId(): string | null {
    return localStorage.getItem('device_id');
  }
  
  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem('currentUser');
    this.tokenService.clearTokens();
    // Note: We keep the device_id for future logins
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
