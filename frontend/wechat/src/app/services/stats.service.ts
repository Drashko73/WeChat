import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  friends: {
    total: number;
    pendingRequests: number;
    sentRequests: number;
  };
  chats: {
    total: number;
    unreadMessages: number;
  };
  messages: {
    sent: number;
    received: number;
    total: number;
  };
}

export interface ActivityStats {
  period: string;
  messages: Array<{ _id: string; count: number }>;
  chats: Array<{ _id: string; count: number }>;
  friends: Array<{ _id: string; count: number }>;
}

export interface MessageTypeStats {
  _id: string;
  count: number;
}

export interface ActiveChat {
  _id: string;
  messageCount: number;
  lastActivity: Date;
  otherParticipants: Array<{
    id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = environment.apiUrl + '/stats';

  constructor(private http: HttpClient) { }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Observable<{ success: boolean; message: string; data: DashboardStats }> {
    return this.http.get<{ success: boolean; message: string; data: DashboardStats }>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Get activity statistics
   */
  getActivityStats(days: number = 7): Observable<{ success: boolean; message: string; data: ActivityStats }> {
    return this.http.get<{ success: boolean; message: string; data: ActivityStats }>(`${this.apiUrl}/activity?days=${days}`);
  }

  /**
   * Get message type statistics
   */
  getMessageTypeStats(): Observable<{ success: boolean; message: string; data: MessageTypeStats[] }> {
    return this.http.get<{ success: boolean; message: string; data: MessageTypeStats[] }>(`${this.apiUrl}/message-types`);
  }

  /**
   * Get most active chats
   */
  getMostActiveChats(limit: number = 5): Observable<{ success: boolean; message: string; data: ActiveChat[] }> {
    return this.http.get<{ success: boolean; message: string; data: ActiveChat[] }>(`${this.apiUrl}/active-chats?limit=${limit}`);
  }
}
