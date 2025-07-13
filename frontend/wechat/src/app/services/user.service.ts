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
}
