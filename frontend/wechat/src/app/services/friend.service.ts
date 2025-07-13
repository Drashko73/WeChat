import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { map, tap } from 'rxjs/operators';

export interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    profile_picture: string | null;
  };
  receiver: {
    id: string;
    username: string;
    full_name: string;
    profile_picture: string | null;
  };
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  sentAt: string;
  updatedAt: string;
}

export interface Friend {
  id: string;
  username: string;
  full_name: string;
  profile_picture: string | null;
  status: string;
  lastSeen: string | null;
  lastInteractionAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type FriendshipStatus = 
  | 'none'  // Not friends, no requests
  | 'friends' // Already friends
  | 'request-sent' // Current user sent a request
  | 'request-received' // Current user received a request
  | 'accepted' // Request was accepted
  | 'rejected' // Request was rejected
  | 'self'; // It's the same user

@Injectable({
  providedIn: 'root'
})
export class FriendService {
  private apiUrl = `${environment.apiUrl}/friends`;
  
  // Subjects for real-time notifications
  private newFriendRequestSubject = new Subject<FriendRequest>();
  private friendRequestAcceptedSubject = new Subject<Friend>();
  private friendRequestRejectedSubject = new Subject<string>();
  private friendRequestCancelledSubject = new Subject<FriendRequest>();
  private friendRemovedSubject = new Subject<{removedById: string, removedByUsername: string, removedByFullName: string}>();
  private friendRemovalConfirmedSubject = new Subject<{removedFriendId: string}>();
  
  // Observable streams that components can subscribe to
  public newFriendRequest$ = this.newFriendRequestSubject.asObservable();
  public friendRequestAccepted$ = this.friendRequestAcceptedSubject.asObservable();
  public friendRequestRejected$ = this.friendRequestRejectedSubject.asObservable();
  public friendRequestCancelled$ = this.friendRequestCancelledSubject.asObservable();
  public friendRemoved$ = this.friendRemovedSubject.asObservable();
  public friendRemovalConfirmed$ = this.friendRemovalConfirmedSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all friend requests (incoming by default)
   */
  getFriendRequests(
    page = 1, 
    limit = 10, 
    direction: 'incoming' | 'outgoing' = 'incoming'
  ): Observable<PaginatedResponse<FriendRequest>> {
    return this.http.get<any>(
      `${this.apiUrl}/requests?page=${page}&limit=${limit}&direction=${direction}`
    ).pipe(
      map(res => res.data)
    );
  }

  /**
   * Get friends list with optional search
   */
  getFriends(
    page = 1, 
    limit = 10, 
    search?: string
  ): Observable<PaginatedResponse<Friend>> {
    let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    
    return this.http.get<any>(url).pipe(
      map(res => res.data)
    );
  }

  /**
   * Send a friend request
   */
  sendFriendRequest(
    receiverId: string, 
    message?: string
  ): Observable<{ success: boolean; data: FriendRequest; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/requests`, {
      receiverId,
      message
    });
  }

  /**
   * Respond to a friend request
   */
  respondToFriendRequest(
    requestId: string, 
    action: 'accept' | 'reject'
  ): Observable<{ success: boolean; data: FriendRequest; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/requests/respond`, {
      requestId,
      action
    });
  }

  /**
   * Cancel a sent friend request
   */
  cancelFriendRequest(requestId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/requests/${requestId}`);
  }

  /**
   * Remove a friend
   */
  removeFriend(friendId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.apiUrl}/${friendId}`);
  }

  /**
   * Check friendship status with another user
   */
  checkFriendshipStatus(userId: string): Observable<{ success: boolean; status: FriendshipStatus }> {
    return this.http.get<any>(`${this.apiUrl}/status/${userId}`);
  }

  /**
   * Notify about a new friend request (to be called when a WebSocket message is received)
   */
  notifyNewFriendRequest(request: FriendRequest): void {
    this.newFriendRequestSubject.next(request);
  }

  /**
   * Notify about an accepted friend request (to be called when a WebSocket message is received)
   */
  notifyFriendRequestAccepted(friend: Friend): void {
    this.friendRequestAcceptedSubject.next(friend);
  }

  /**
   * Notify about a rejected friend request (to be called when a WebSocket message is received)
   */
  notifyFriendRequestRejected(request: string): void {
    this.friendRequestRejectedSubject.next(request);
  }

  /**
   * Notify about a cancelled friend request (to be called when a WebSocket message is received)
   */
  notifyFriendRequestCancelled(request: FriendRequest): void {
    this.friendRequestCancelledSubject.next(request);
  }

  /**
   * Notify about a friend removal (to be called when a WebSocket message is received)
   */
  notifyFriendRemoved(data: {removedById: string, removedByUsername: string, removedByFullName: string}): void {
    this.friendRemovedSubject.next(data);
  }

  /**
   * Notify about friend removal confirmation (to be called when a WebSocket message is received)
   */
  notifyFriendRemovalConfirmed(data: {removedFriendId: string}): void {
    this.friendRemovalConfirmedSubject.next(data);
  }

  /**
   * Notify about online users (to be called when a WebSocket message is received)
   */
  notifyOnlineUsers(userId: string): void {
    console.log('Online users updated:', [userId]);
  }
}
