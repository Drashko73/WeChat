import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { map, tap } from 'rxjs/operators';

export interface ChatMessage {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    full_name: string;
    username: string;
    profile_pic_path?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      full_name: string;
      username: string;
    };
    type: string;
    createdAt: string;
  };
  reactions: Array<{
    user: string;
    emoji: string;
    createdAt: string;
  }>;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  deliveredTo: Array<{
    user: string;
    deliveredAt: string;
  }>;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  participants: Array<{
    _id: string;
    full_name: string;
    username: string;
    profile_pic_path?: string;
  }>;
  type: 'private' | 'group';
  name?: string;
  description?: string;
  lastMessage?: {
    _id: string;
    content: string;
    type: string;
    sender: {
      _id: string;
      full_name: string;
      username: string;
    };
    createdAt: string;
    isDeleted: boolean;
  };
  lastActivity: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalMessages?: number;
  totalChats?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'file';
  replyToId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  
  // Subjects for real-time updates
  private newMessageSubject = new Subject<ChatMessage>();
  private messageEditedSubject = new Subject<ChatMessage>();
  private messageDeletedSubject = new Subject<{messageId: string, chatId: string}>();
  private messageReactionSubject = new Subject<{messageId: string, userId: string, emoji: string}>();
  private messagesReadSubject = new Subject<{chatId: string, userId: string, messageIds: string[] | 'all'}>();
  private typingSubject = new Subject<{chatId: string, userId: string, isTyping: boolean}>();
  
  // Current active chat
  private activeChatSubject = new BehaviorSubject<Chat | null>(null);
  
  // Observables
  public newMessage$ = this.newMessageSubject.asObservable();
  public messageEdited$ = this.messageEditedSubject.asObservable();
  public messageDeleted$ = this.messageDeletedSubject.asObservable();
  public messageReaction$ = this.messageReactionSubject.asObservable();
  public messagesRead$ = this.messagesReadSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();
  public activeChat$ = this.activeChatSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get all chats for the current user
   */
  getUserChats(page: number = 1, limit: number = 20): Observable<PaginatedResponse<Chat>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/chats`, { params })
      .pipe(
        map(response => ({
          data: response.data.chats,
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          totalChats: response.data.totalChats,
          hasNextPage: response.data.hasNextPage,
          hasPrevPage: response.data.hasPrevPage
        }))
      );
  }

  /**
   * Get or create a private chat with another user
   */
  getOrCreatePrivateChat(friendId: string): Observable<Chat> {
    return this.http.get<any>(`${this.apiUrl}/chats/private/${friendId}`)
      .pipe(
        map(response => response.data.chat),
        tap(chat => this.activeChatSubject.next(chat))
      );
  }

  /**
   * Get messages for a specific chat
   */
  getChatMessages(chatId: string, page: number = 1, limit: number = 25): Observable<PaginatedResponse<ChatMessage>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/chats/${chatId}/messages`, { params })
      .pipe(
        map(response => ({
          data: response.data.messages,
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          totalMessages: response.data.totalMessages,
          hasNextPage: response.data.hasNextPage,
          hasPrevPage: response.data.hasPrevPage
        }))
      );
  }

  /**
   * Send a message in a chat
   */
  sendMessage(chatId: string, message: SendMessageRequest, files?: FileList): Observable<ChatMessage> {
    const formData = new FormData();
    formData.append('content', message.content);
    
    if (message.type) {
      formData.append('type', message.type);
    }
    
    if (message.replyToId) {
      formData.append('replyToId', message.replyToId);
    }

    // Add files if any
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }

    return this.http.post<any>(`${this.apiUrl}/chats/${chatId}/messages`, formData)
      .pipe(
        map(response => response.data.message)
      );
  }

  /**
   * Mark messages as read
   */
  markMessagesAsRead(chatId: string, messageIds?: string[]): Observable<void> {
    const body = messageIds ? { messageIds } : {};
    
    return this.http.put<any>(`${this.apiUrl}/chats/${chatId}/read`, body)
      .pipe(
        map(() => void 0)
      );
  }

  /**
   * Edit a message
   */
  editMessage(messageId: string, content: string): Observable<ChatMessage> {
    return this.http.put<any>(`${this.apiUrl}/chats/messages/${messageId}`, { content })
      .pipe(
        map(response => response.data.message)
      );
  }

  /**
   * Delete a message
   */
  deleteMessage(messageId: string): Observable<ChatMessage> {
    return this.http.delete<any>(`${this.apiUrl}/chats/messages/${messageId}`)
      .pipe(
        map(response => response.data.message)
      );
  }

  /**
   * Add reaction to a message
   */
  addReaction(messageId: string, emoji: string): Observable<ChatMessage> {
    return this.http.post<any>(`${this.apiUrl}/chats/messages/${messageId}/reactions`, { emoji })
      .pipe(
        map(response => response.data.message)
      );
  }

  /**
   * Remove reaction from a message
   */
  removeReaction(messageId: string): Observable<ChatMessage> {
    return this.http.delete<any>(`${this.apiUrl}/chats/messages/${messageId}/reactions`)
      .pipe(
        map(response => response.data.message)
      );
  }

  /**
   * Get unread message count
   */
  getUnreadMessageCount(): Observable<number> {
    return this.http.get<any>(`${this.apiUrl}/chats/unread-count`)
      .pipe(
        map(response => response.data.unreadCount)
      );
  }

  /**
   * Set the active chat
   */
  setActiveChat(chat: Chat | null): void {
    this.activeChatSubject.next(chat);
  }

  /**
   * Get the current active chat
   */
  getActiveChat(): Chat | null {
    return this.activeChatSubject.value;
  }

  // Methods for handling real-time events (called by real-time service)
  
  handleNewMessage(message: ChatMessage): void {
    this.newMessageSubject.next(message);
  }

  handleMessageEdited(message: ChatMessage): void {
    this.messageEditedSubject.next(message);
  }

  handleMessageDeleted(data: {messageId: string, chatId: string}): void {
    this.messageDeletedSubject.next(data);
  }

  handleMessageReaction(data: {messageId: string, userId: string, emoji: string}): void {
    this.messageReactionSubject.next(data);
  }

  handleMessagesRead(data: {chatId: string, userId: string, messageIds: string[] | 'all'}): void {
    this.messagesReadSubject.next(data);
  }

  handleTypingStart(data: {chatId: string, userId: string}): void {
    this.typingSubject.next({...data, isTyping: true});
  }

  handleTypingStop(data: {chatId: string, userId: string}): void {
    this.typingSubject.next({...data, isTyping: false});
  }
}
