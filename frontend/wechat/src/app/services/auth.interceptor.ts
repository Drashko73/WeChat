import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { TokenService } from './token.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private tokenService: TokenService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get device ID from localStorage
    const deviceId = localStorage.getItem('device_id');
    
    // Clone the request to add headers
    let authReq = request;
    
    // Add the device ID header to all requests if available
    if (deviceId) {
      authReq = authReq.clone({
        setHeaders: { 'X-Device-ID': deviceId }
      });
    }
    
    // Add authorization header with JWT token if available
    if (this.tokenService.hasAccessToken() && !this.isAuthUrl(request.url)) {
      const accessToken = this.tokenService.getAccessToken();
      if (accessToken) {
        authReq = authReq.clone({
          setHeaders: { 
            'Authorization': `Bearer ${accessToken}`,
            ...deviceId ? { 'X-Device-ID': deviceId } : {}
          }
        });
      }
    }
    
    // Pass on the modified request
    return next.handle(authReq).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && !this.isAuthUrl(request.url)) {
          // Try to refresh the token if 401 error occurs
          return this.handle401Error(authReq, next);
        }
        
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Check if the request is for an authentication endpoint
   * We don't want to add or refresh tokens for these requests
   */
  private isAuthUrl(url: string): boolean {
    const authUrls = [
      `${environment.apiUrl}/auth/login`,
      `${environment.apiUrl}/auth/register`,
      `${environment.apiUrl}/auth/refresh-token`
    ];
    return authUrls.some(authUrl => url.includes(authUrl));
  }
  
  /**
   * Handle 401 errors by refreshing the token and retrying the request
   */
  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.tokenService.refreshToken().pipe(
        switchMap(response => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.access_token);
          
          // Clone the original request with the new token
          const newRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${response.access_token}`
            }
          });
          
          return next.handle(newRequest);
        }),
        catchError(error => {
          this.isRefreshing = false;
          
          // If refresh fails, handle logout or redirect to login
          return throwError(() => error);
        })
      );
    } else {
      // If refresh is in progress, wait for it to complete and retry with new token
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          const newRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next.handle(newRequest);
        })
      );
    }
  }
}
