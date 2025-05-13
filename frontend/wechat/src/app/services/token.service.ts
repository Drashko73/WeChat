import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, tap, filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private apiUrl = environment.apiUrl;
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  /**
   * Check if access token exists
   */
  hasAccessToken(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Set a new access token
   */
  setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  /**
   * Get the current refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Set a new refresh token
   */
  setRefreshToken(token: string): void {
    localStorage.setItem('refresh_token', token);
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Check if the access token is expired
   * 
   * This is a simple implementation. In a production app, 
   * you'd want to decode the JWT and check its exp claim.
   * 
   * @returns boolean - true if token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch (e) {
      return true;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  refreshToken(): Observable<TokenResponse> {
    if (this.refreshTokenInProgress) {
      // If refresh is already in progress, wait for it to complete
      return this.refreshTokenSubject.pipe(
        filter(result => result !== null),
        take(1),
        switchMap(() => {
          // After the refresh is complete, return an observable with the new token
          return new Observable<TokenResponse>(observer => {
            observer.next({
              access_token: this.getAccessToken() || ''
            });
            observer.complete();
          });
        })
      );
    } 
    
    // Set refreshing flag
    this.refreshTokenInProgress = true;
    
    // Reset the subject to null
    this.refreshTokenSubject.next(null);
    
    // Get the refresh token
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.refreshTokenInProgress = false;
      return throwError(() => new Error('No refresh token available'));
    }
    
    // Send the refresh token to the server to get a new access token
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap((response) => {
        // Store the new tokens
        this.setAccessToken(response.access_token);
        if (response.refresh_token) {
          this.setRefreshToken(response.refresh_token);
        }
        
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(response);
      }),
      catchError((error) => {
        this.refreshTokenInProgress = false;
        this.refreshTokenSubject.next(null);
        
        // If refresh token is invalid, clear all tokens
        this.clearTokens();
        return throwError(() => error);
      })
    );
  }
}
