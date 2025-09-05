import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PaginatedResponse } from './friend.service';

export interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  profile_picture: string | null;
  friendStatus: 'none' | 'friends' | 'request-sent' | 'request-received';
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  profile_picture: string | null;
  email_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Search for users by username or full name
   */
  searchUsers(
    searchTerm: string,
    page = 1,
    limit = 10
  ): Observable<PaginatedResponse<UserSearchResult>> {
    return this.http.get<any>(
      `${this.apiUrl}/search?searchTerm=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`
    ).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get current user's profile information
   */
  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<any>(`${this.apiUrl}/profile`).pipe(
      map(res => res.data)
    );
  }

  /**
   * Update current user's profile
   */
  updateProfile(formData: FormData): Observable<UserProfile> {
    return this.http.put<any>(`${this.apiUrl}/profile`, formData).pipe(
      map(res => res.data)
    );
  }
}
