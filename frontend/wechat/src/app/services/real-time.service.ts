import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { FriendService, FriendRequest, Friend } from './friend.service';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface OnlineUser {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealTimeService {
  private socket: WebSocket | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private reconnectInterval: any;
  private messageSubject = new Subject<WebSocketMessage>();
  private onlineUsersSubject = new BehaviorSubject<Map<string, OnlineUser>>(new Map());

  // Observable for components to subscribe to socket connection state
  public connected$ = this.connected.asObservable();
  
  // Observable for components to subscribe to all websocket messages
  public message$ = this.messageSubject.asObservable();

  // Observable for online users status
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  constructor(
    private authService: AuthService,
    private friendService: FriendService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    // Connect when authentication state changes
    this.authService.currentUser.subscribe((user: any) => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    // Handle reconnection
    this.connected$.subscribe(isConnected => {
      if (!isConnected && this.authService.isAuthenticated()) {
        if (!this.reconnectInterval) {
          this.reconnectInterval = setInterval(() => {
            if (!this.connected.value) {
              this.connect();
            } else {
              clearInterval(this.reconnectInterval);
              this.reconnectInterval = null;
            }
          }, 5000); // Try to reconnect every 5 seconds
        }
      }
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('Cannot connect to WebSocket: No access token');
      return;
    }

    // Use the current host (where the frontend is served) for WebSocket connection
    // This works because nginx proxies /ws to the backend container
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws?token=${token}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // console.log('WebSocket connected');
        this.connected.next(true);
        
        // Request current online users list after connection
        this.requestOnlineUsers();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          // console.log('WebSocket message received:', message);
          this.messageSubject.next(message);

          // Handle specific message types
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        // console.log('WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        this.connected.next(false);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connected.next(false);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connected.next(false);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected.next(false);
      this.onlineUsersSubject.next(new Map()); // Clear online users

      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    }
  }

  /**
   * Send message through WebSocket
   */
  send(type: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, data };
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
    }
  }

  /**
   * Request current online users list from server
   */
  private requestOnlineUsers() {
    this.send('get_online_users', {});
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connection_established':
        // console.log('WebSocket connection established:', message.data);
        // Process initial online users list if provided
        if (message.data.onlineUsers && Array.isArray(message.data.onlineUsers)) {
          this.processOnlineUsersList(message.data.onlineUsers);
        }
        break;

      case 'online_users_list':
        // Process the current online users list
        if (message.data.onlineUsers && Array.isArray(message.data.onlineUsers)) {
          this.processOnlineUsersList(message.data.onlineUsers);
        }
        break;

      case 'user_connected':
      case 'user_online':
        this.updateUserOnlineStatus(message.data.userId, true);
        break;

      case 'user_disconnected':
      case 'user_offline':
        this.updateUserOnlineStatus(message.data.userId, false, message.data.lastSeen);
        break;

      case 'friend_request':
        // New friend request received
        this.friendService.notifyNewFriendRequest(message.data as FriendRequest);
        this.showFriendRequestNotification(message.data as FriendRequest);
        break;
      
      case 'friend_request_accepted':
        // Friend request was accepted
        this.friendService.notifyFriendRequestAccepted(message.data as Friend);
        this.showFriendRequestAcceptedNotification(message.data as Friend);
        break;

      case 'friend_request_rejected':
        // Friend request was rejected
        this.friendService.notifyFriendRequestRejected(message.data.requestId);
        this.showFriendRequestRejectedNotification();
        break;

      case 'friend_request_cancelled':
        // Friend request was cancelled
        this.friendService.notifyFriendRequestCancelled(message.data as FriendRequest);
        this.showFriendRequestCancelledNotification(message.data as FriendRequest);
        break;

      case 'friend_removed':
        // Friend was removed by another user
        this.friendService.notifyFriendRemoved(message.data);
        this.showFriendRemovedNotification(message.data);
        break;

      case 'friend_removal_confirmed':
        // Confirmation that friend was removed successfully
        this.friendService.notifyFriendRemovalConfirmed(message.data);
        break;

      case 'requests_removed':
        // Pending friend requests were automatically removed
        this.showRequestsRemovedNotification(message.data.friendName);
        break;

      // Chat-related message types
      case 'new_message':
        // New message received
        this.chatService.handleNewMessage(message.data.message);
        this.showNewMessageNotification(message.data.message);
        break;

      case 'message_edited':
        // Message was edited
        this.chatService.handleMessageEdited(message.data.message);
        break;

      case 'message_deleted':
        // Message was deleted
        this.chatService.handleMessageDeleted({
          messageId: message.data.messageId,
          chatId: message.data.chatId
        });
        break;

      case 'message_reaction_added':
        // Reaction was added to a message
        this.chatService.handleMessageReaction({
          messageId: message.data.messageId,
          userId: message.data.userId,
          emoji: message.data.emoji
        });
        break;

      case 'messages_read':
        // Messages were read by someone
        this.chatService.handleMessagesRead({
          chatId: message.data.chatId,
          userId: message.data.userId,
          messageIds: message.data.messageIds
        });
        break;

      case 'user_typing_start':
        // User started typing
        this.chatService.handleTypingStart({
          chatId: message.data.chatId,
          userId: message.data.userId
        });
        break;

      case 'user_typing_stop':
        // User stopped typing
        this.chatService.handleTypingStop({
          chatId: message.data.chatId,
          userId: message.data.userId
        });
        break;

      case 'chat_joined':
        // Successfully joined a chat
        // console.log('Joined chat:', message.data.chatId);
        break;

      case 'chat_left':
        // Successfully left a chat
        // console.log('Left chat:', message.data.chatId);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Update user online status
   */
  private updateUserOnlineStatus(userId: string, isOnline: boolean, lastSeen?: string) {
    const currentUsers = this.onlineUsersSubject.value;
    const updatedUsers = new Map(currentUsers);
    
    if (isOnline) {
      updatedUsers.set(userId, {
        userId,
        isOnline: true,
        lastSeen: new Date().toISOString()
      });
    } else {
      // Update user as offline with lastSeen time
      updatedUsers.set(userId, {
        userId,
        isOnline: false,
        lastSeen: lastSeen || new Date().toISOString()
      });
    }
    
    this.onlineUsersSubject.next(updatedUsers);
  }

  /**
   * Update online users list
   */
  private updateOnlineUsersList(users: OnlineUser[]) {
    const updatedUsers = new Map<string, OnlineUser>();
    users.forEach(user => {
      updatedUsers.set(user.userId, user);
    });
    this.onlineUsersSubject.next(updatedUsers);
  }

  /**
   * Process initial online users list from server
   */
  private processOnlineUsersList(onlineUserIds: string[]) {
    // console.log('Processing online users list:', onlineUserIds);
    
    // Clear current online users
    const updatedUsers = new Map<string, OnlineUser>();
    
    // Mark all users in the list as online
    onlineUserIds.forEach(userId => {
      updatedUsers.set(userId, {
        userId,
        isOnline: true,
        lastSeen: new Date().toISOString()
      });
    });
    
    this.onlineUsersSubject.next(updatedUsers);
  }

  /**
   * Get online status for a specific user
   */
  getUserOnlineStatus(userId: string): Observable<OnlineUser | undefined> {
    return this.onlineUsers$.pipe(
      map(users => users.get(userId))
    );
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    const user = this.onlineUsersSubject.value.get(userId);
    return user?.isOnline || false;
  }

  /**
   * Show notification for new friend request
   */
  private showFriendRequestNotification(request: FriendRequest) {
    this.notificationService.info(
      'New Friend Request',
      `${request.sender.full_name} sent you a friend request`,
      undefined,
      {
        label: 'View',
        callback: () => {
          // You can navigate to friends page or handle this as needed
          // console.log('Navigate to friend requests');
          this.router.navigate(['/friends/'])
        }
      }
    );
  }

  /**
   * Show notification for accepted friend request
   */
  private showFriendRequestAcceptedNotification(friend: Friend) {
    this.notificationService.success(
      'Friend Request Accepted',
      `${friend.full_name} accepted your friend request`,
      undefined,
      {
        label: 'View',
        callback: () => {
          // console.log('Navigate to friends list');
          this.router.navigate(['/friends/']);
        }
      }
    );
  }

  /**
   * Show notification for rejected friend request
   */
  private showFriendRequestRejectedNotification() {
    this.notificationService.info(
      'Friend Request Rejected',
      'Your friend request was rejected'
    );
  }

  /**
   * Show notification for cancelled friend request
   */
  private showFriendRequestCancelledNotification(request: FriendRequest) {
    this.notificationService.info(
      'Friend Request Cancelled',
      `${request.sender.full_name} cancelled their friend request`
    );
  }

  /**
   * Show notification for friend removal
   */
  private showFriendRemovedNotification(data: {removedByUsername: string, removedByFullName: string}) {
    this.notificationService.info(
      'Friend Removed',
      `${data.removedByFullName} removed you from their friends list`
    );
  }

  /**
   * Show notification for automatically removed requests
   */
  private showRequestsRemovedNotification(friendName: string) {
    this.notificationService.info(
      'Requests Removed',
      `Pending friend requests with ${friendName} were automatically removed`
    );
  }

  /**
   * Show notification for new chat message
   */
  private showNewMessageNotification(message: any) {
    // Only show notification if the message is not from the current user
    // and if the user is not currently viewing this chat
    const currentUser = this.authService.getCurrentUserValue();
    const activeChat = this.chatService.getActiveChat();
    
    if (message.sender._id !== currentUser?.id && (!activeChat || activeChat._id !== message.chat) && !this.router.url.includes('messages')) {
      this.notificationService.info(
        'New Message',
        `${message.sender.full_name}: ${message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content}`,
        undefined,
        {
          label: 'View Messages',
          callback: () => {
            // Navigate to chat - this could be handled by the router
            // console.log('Navigate to chat:', message.chat);
            this.router.navigate(['/messages/']);
          }
        }
      );
    }
  }

  /**
   * Get messages of a specific type
   */
  getMessagesByType<T>(type: string): Observable<T> {
    return this.message$.pipe(
      filter(message => message.type === type),
      filter(message => message.data !== undefined),
      filter(message => message.data !== null),
      filter(message => {
        try {
          // Ensure the data can be parsed/accessed
          JSON.stringify(message.data);
          return true;
        } catch (e) {
          return false;
        }
      }),
      map(message => message.data as T)
    );
  }

  /**
   * Sync online users with server (fallback mechanism)
   */
  public syncOnlineUsers() {
    if (this.connected.value) {
      this.requestOnlineUsers();
    }
  }

  // Chat-specific WebSocket methods

  /**
   * Join a chat room for real-time updates
   */
  joinChat(chatId: string) {
    this.send('join_chat', { chatId });
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId: string) {
    this.send('leave_chat', { chatId });
  }

  /**
   * Send typing start indicator
   */
  startTyping(chatId: string) {
    this.send('typing_start', { chatId });
  }

  /**
   * Send typing stop indicator
   */
  stopTyping(chatId: string) {
    this.send('typing_stop', { chatId });
  }

  /**
   * Send message read receipt
   */
  sendReadReceipt(chatId: string, messageIds: string[]) {
    this.send('message_read', { chatId, messageIds });
  }
}
