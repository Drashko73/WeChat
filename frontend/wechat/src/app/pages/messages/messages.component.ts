import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { ChatService, Chat, ChatMessage, SendMessageRequest } from '../../services/chat.service';
import { FriendService, Friend } from '../../services/friend.service';
import { RealTimeService } from '../../services/real-time.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messages',
  imports: [CommonModule, FormsModule, ProfilePictureComponent],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.css'
})
export class MessagesComponent implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit {
  @ViewChild('messagesScrollContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  // Current state
  chats: Chat[] = [];
  currentChat: Chat | null = null;
  messages: ChatMessage[] = [];
  friends: Friend[] = [];
  currentUser: any = null;
  
  // UI state
  newMessageContent: string = '';
  isLoading: boolean = false;
  isLoadingMessages: boolean = false;
  isLoadingChats: boolean = false;
  isSendingMessage: boolean = false;
  showFriendsList: boolean = false;
  showMobileChatList: boolean = false;
  selectedFiles: FileList | null = null;
  replyToMessage: ChatMessage | null = null;
  
  // Scroll management
  showJumpToLatest: boolean = false;
  newMessagesCount: number = 0;
  isUserNearBottom: boolean = true;
  private scrollThreshold: number = 100; // px from bottom to consider "near bottom"
  
  // Typing indicators
  typingUsers: Set<string> = new Set();
  typingTimeout: any = null;
  
  // Real-time subscriptions
  private subscriptions: Subscription[] = [];
  
  // Pagination
  currentPage: number = 1;
  hasMoreMessages: boolean = true;
  
  // Auto-scroll management
  private shouldScrollToBottom: boolean = true;

  constructor(
    public chatService: ChatService,
    public friendService: FriendService,
    public realTimeService: RealTimeService,
    public authService: AuthService,
    public notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUserValue();
    
    // Load initial data
    this.loadChats();
    this.loadFriends();
    
    // Subscribe to real-time events
    this.subscribeToRealTimeEvents();
    
    // Handle route parameters (if a specific chat is requested)
    this.route.queryParams.subscribe(params => {
      if (params['chatId']) {
        this.openChatById(params['chatId']);
      } else if (params['friendId']) {
        this.startChatWithFriend(params['friendId']);
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Leave current chat if any
    if (this.currentChat) {
      this.realTimeService.leaveChat(this.currentChat._id);
    }
    
    // Clear typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  ngAfterViewChecked() {
    // Remove automatic scrolling from ngAfterViewChecked
    // We'll handle scrolling manually where needed
  }

  // Add scroll event listener after view initialization
  ngAfterViewInit() {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.addEventListener('scroll', () => {
        this.onScroll();
      });
    }
  }

  private onScroll() {
    if (!this.messagesContainer) return;

    const container = this.messagesContainer.nativeElement;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Check if user is near bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    this.isUserNearBottom = distanceFromBottom <= this.scrollThreshold;

    // Hide/show jump to latest button
    this.showJumpToLatest = !this.isUserNearBottom && this.newMessagesCount > 0;

    // Reset new messages count if user scrolled to bottom
    if (this.isUserNearBottom) {
      this.newMessagesCount = 0;
      this.showJumpToLatest = false;
    }

    // Load older messages if scrolled to top
    if (scrollTop === 0 && this.hasMoreMessages && !this.isLoadingMessages) {
      this.loadOlderMessages();
    }
  }

  private subscribeToRealTimeEvents() {
    // New message
    this.subscriptions.push(
      this.chatService.newMessage$.subscribe(message => {
        // console.log('Received new message via WebSocket:', message);
        if (this.currentChat && message.chat === this.currentChat._id) {
          this.messages.push(message);
          
          // Auto-scroll logic:
          // 1. Always scroll for own messages
          // 2. Only scroll for others' messages if user is near bottom
          if (message.sender._id === this.currentUser?.id) {
            // Own message - always scroll to bottom
            this.isUserNearBottom = true; // Update state to reflect we'll be at bottom
            setTimeout(() => {
              this.scrollToBottom();
            }, 10);
          } else if (this.isUserNearBottom) {
            // Other's message and user is near bottom - scroll and mark as read
            setTimeout(() => {
              this.scrollToBottom();
            }, 10);
            this.markMessageAsRead(message._id);
          } else {
            // Other's message and user is scrolled up - show notification, don't scroll
            this.newMessagesCount++;
            this.showJumpToLatest = true;
          }
        }
        
        // Update chat list
        this.updateChatInList(message.chat, message);
      })
    );

    // Message edited
    this.subscriptions.push(
      this.chatService.messageEdited$.subscribe(editedMessage => {
        if (this.currentChat && editedMessage.chat === this.currentChat._id) {
          const index = this.messages.findIndex(m => m._id === editedMessage._id);
          if (index !== -1) {
            this.messages[index] = editedMessage;
          }
        }
      })
    );

    // Message deleted
    this.subscriptions.push(
      this.chatService.messageDeleted$.subscribe(data => {
        // console.log('Received message deleted event:', data);
        if (this.currentChat && data.chatId === this.currentChat._id) {
          const message = this.messages.find(m => m._id === data.messageId);
          if (message) {
            message.isDeleted = true;
            message.content = '[This message was deleted]';
            message.attachments = []; // Clear attachments
          }
        }
      })
    );

    // Typing indicators
    this.subscriptions.push(
      this.chatService.typing$.subscribe(data => {
        if (this.currentChat && data.chatId === this.currentChat._id && data.userId !== this.currentUser?.id) {
          if (data.isTyping) {
            this.typingUsers.add(data.userId);
          } else {
            this.typingUsers.delete(data.userId);
          }
        }
      })
    );

    // Messages read
    this.subscriptions.push(
      this.chatService.messagesRead$.subscribe(data => {
        if (this.currentChat && data.chatId === this.currentChat._id) {
          // Update read status for messages
          this.messages.forEach(message => {
            if (message.sender._id === this.currentUser?.id) {
              const existingRead = message.readBy.find(r => r.user === data.userId);
              if (!existingRead) {
                message.readBy.push({
                  user: data.userId,
                  readAt: new Date().toISOString()
                });
              }
            }
          });
        }
      })
    );
  }

  async loadChats() {
    this.isLoadingChats = true;
    try {
      // console.log('Loading chats...');
      const response = await this.chatService.getUserChats().toPromise();
      // console.log('Chats response:', response);
      this.chats = response?.data || [];
      // console.log('Loaded chats:', this.chats);
    } catch (error) {
      console.error('Error loading chats:', error);
      this.notificationService.error('Error', 'Failed to load chats');
    } finally {
      this.isLoadingChats = false;
    }
  }

  async loadFriends() {
    try {
      const response = await this.friendService.getFriends().toPromise();
      this.friends = response?.data || [];
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  async openChat(chat: Chat) {
    if (this.currentChat?._id === chat._id) return;

    // Leave previous chat
    if (this.currentChat) {
      this.realTimeService.leaveChat(this.currentChat._id);
    }

    // Set new chat
    this.currentChat = chat;
    this.chatService.setActiveChat(chat);
    this.messages = [];
    this.currentPage = 1;
    this.hasMoreMessages = true;
    
    // Reset scroll state
    this.isUserNearBottom = true;
    this.showJumpToLatest = false;
    this.newMessagesCount = 0;
    this.shouldScrollToBottom = true;
    
    // Clear image loading states for new chat
    this.imageLoadingStates.clear();

    // Join new chat
    this.realTimeService.joinChat(chat._id);

    // Load messages
    await this.loadMessages();

    // Mark messages as read
    this.markAllMessagesAsRead();
  }

  async openChatById(chatId: string) {
    const existingChat = this.chats.find(c => c._id === chatId);
    if (existingChat) {
      await this.openChat(existingChat);
    }
  }

  async startChatWithFriend(friendId: string) {
    try {
      const chat = await this.chatService.getOrCreatePrivateChat(friendId).toPromise();
      if (chat) {
        // Add to chats list if not already there
        const existingChat = this.chats.find(c => c._id === chat._id);
        if (!existingChat) {
          this.chats.unshift(chat);
        }
        await this.openChat(chat);
      }
    } catch (error) {
      console.error('Error starting chat with friend:', error);
      this.notificationService.error('Error', 'Failed to start chat');
    }
  }

  async loadMessages() {
    if (!this.currentChat || !this.hasMoreMessages) return;

    this.isLoadingMessages = true;
    try {
      const response = await this.chatService.getChatMessages(
        this.currentChat._id, 
        this.currentPage
      ).toPromise();
      
      if (response) {
        if (this.currentPage === 1) {
          // Initial load - show latest messages
          this.messages = response.data;
          this.shouldScrollToBottom = true;
          
          // Ensure we scroll to bottom after DOM update
          setTimeout(() => {
            this.scrollToBottom();
          }, 50);
        } else {
          // Loading older messages - prepend them
          const scrollHeight = this.messagesContainer?.nativeElement.scrollHeight || 0;
          this.messages = [...response.data, ...this.messages];
          this.shouldScrollToBottom = false;
          
          // Maintain scroll position after adding older messages
          setTimeout(() => {
            if (this.messagesContainer) {
              const newScrollHeight = this.messagesContainer.nativeElement.scrollHeight;
              this.messagesContainer.nativeElement.scrollTop = newScrollHeight - scrollHeight;
            }
          });
        }
        
        this.hasMoreMessages = response.hasNextPage;
        this.currentPage++;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.notificationService.error('Error', 'Failed to load messages');
    } finally {
      this.isLoadingMessages = false;
    }
  }

  async loadOlderMessages() {
    if (!this.currentChat || !this.hasMoreMessages || this.isLoadingMessages) return;
    
    await this.loadMessages();
  }

  async sendMessage() {
    if (!this.newMessageContent.trim() || !this.currentChat || this.isSendingMessage) {
      return;
    }

    const messageData: SendMessageRequest = {
      content: this.newMessageContent.trim(),
      replyToId: this.replyToMessage?._id
    };

    this.isSendingMessage = true;
    // console.log('Sending message:', messageData);
    
    try {
      const message = await this.chatService.sendMessage(
        this.currentChat._id, 
        messageData, 
        this.selectedFiles || undefined
      ).toPromise();
      
      // console.log('Message sent successfully:', message);
      
      if (message) {
        // Add to messages immediately for better UX
        this.messages.push(message);
        this.isUserNearBottom = true; // Force scroll for own messages
        
        // Scroll to bottom directly
        setTimeout(() => {
          this.scrollToBottom();
        }, 10);
        
        // Update chat in list
        this.updateChatInList(this.currentChat._id, message);
      }
      
      // Clear input
      this.newMessageContent = '';
      this.selectedFiles = null;
      this.replyToMessage = null;
      
      // Stop typing indicator
      this.stopTypingIndicator();
      
    } catch (error) {
      console.error('Error sending message:', error);
      this.notificationService.error('Error', 'Failed to send message');
    } finally {
      this.isSendingMessage = false;
    }
  }

  onTyping() {
    if (!this.currentChat) return;

    // Send typing start
    this.realTimeService.startTyping(this.currentChat._id);
    
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Set timeout to stop typing
    this.typingTimeout = setTimeout(() => {
      this.stopTypingIndicator();
    }, 3000);
  }

  private stopTypingIndicator() {
    if (this.currentChat) {
      this.realTimeService.stopTyping(this.currentChat._id);
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  markMessageAsRead(messageId: string) {
    if (!this.currentChat) return;
    
    this.chatService.markMessagesAsRead(this.currentChat._id, [messageId]).subscribe({
      error: (error) => console.error('Error marking message as read:', error)
    });
  }

  markAllMessagesAsRead() {
    if (!this.currentChat) return;
    
    this.chatService.markMessagesAsRead(this.currentChat._id).subscribe({
      error: (error) => console.error('Error marking messages as read:', error)
    });
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.target.files;
  }

  removeSelectedFiles() {
    this.selectedFiles = null;
  }

  replyToMessageAction(message: ChatMessage) {
    this.replyToMessage = message;
    this.messageInput?.nativeElement?.focus();
  }

  cancelReply() {
    this.replyToMessage = null;
  }

  deleteMessage(messageId: string) {
    if (confirm('Are you sure you want to delete this message?')) {
      this.chatService.deleteMessage(messageId).subscribe({
        next: () => {
          // Message will be updated via real-time event
        },
        error: (error) => {
          console.error('Error deleting message:', error);
          this.notificationService.error('Error', 'Failed to delete message');
        }
      });
    }
  }

  toggleFriendsList() {
    // console.log('Toggling friends list visibility');
    this.showFriendsList = !this.showFriendsList;
  }

  toggleMobileChatList() {
    this.showMobileChatList = !this.showMobileChatList;
  }

  private updateChatInList(chatId: string, lastMessage: ChatMessage) {
    const chatIndex = this.chats.findIndex(c => c._id === chatId);
    if (chatIndex !== -1) {
      this.chats[chatIndex].lastMessage = {
        _id: lastMessage._id,
        content: lastMessage.content,
        type: lastMessage.type,
        sender: lastMessage.sender,
        createdAt: lastMessage.createdAt,
        isDeleted: lastMessage.isDeleted
      };
      this.chats[chatIndex].lastActivity = lastMessage.createdAt;
      
      // Move chat to top
      const [chat] = this.chats.splice(chatIndex, 1);
      this.chats.unshift(chat);
    }
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }

  jumpToLatest() {
    this.isUserNearBottom = true;
    this.newMessagesCount = 0;
    this.showJumpToLatest = false;
    
    // Mark latest messages as read
    if (this.currentChat) {
      this.markAllMessagesAsRead();
    }
    
    // Direct scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
    }, 10);
  }

  getOtherParticipant(chat: Chat): any {
    return chat.participants.find(p => p._id !== this.currentUser?.id);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  getTypingUsersText(): string {
    if (this.typingUsers.size === 0) return '';
    if (this.typingUsers.size === 1) return 'Someone is typing...';
    return `${this.typingUsers.size} people are typing...`;
  }

  isMessageFromCurrentUser(message: ChatMessage): boolean {
    return message.sender._id === this.currentUser?.id;
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return message._id;
  }

  // Cache for file URLs to prevent repeated calculations
  private _fileUrlCache = new Map<string, string>();
  
  // Track image loading states
  imageLoadingStates = new Map<string, { loading: boolean; error: boolean; loaded: boolean }>();

  // Utility functions for attachments
  getFileUrl(attachment: any): string {
    // Use a simple and reliable approach based on the filename
    // Since we know the backend serves files at /api/uploads/chat_files/
    if (!attachment || !attachment.filename) {
      console.error('Attachment missing filename:', attachment);
      return '';
    }
    
    // Check cache first to prevent repeated URL construction
    if (this._fileUrlCache.has(attachment.filename)) {
      return this._fileUrlCache.get(attachment.filename)!;
    }
    
    // Construct the URL directly using the filename
    const url = `${environment.apiUrl}/uploads/chat_files/${attachment.filename}`;
    
    // Cache the result
    this._fileUrlCache.set(attachment.filename, url);
    
    // Initialize loading state
    if (!this.imageLoadingStates.has(attachment.filename)) {
      this.imageLoadingStates.set(attachment.filename, { loading: true, error: false, loaded: false });
    }
    
    console.log('Url:', url);

    return url;
  }
  
  // Get sanitized file URL (useful for programmatic access)
  getSafeFileUrl(attachment: any) {
    const url = this.getFileUrl(attachment);
    return url ? this.sanitizer.bypassSecurityTrustUrl(url) : '';
  }
  
  // Get image loading state
  getImageLoadingState(attachment: any) {
    return this.imageLoadingStates.get(attachment.filename) || { loading: true, error: false, loaded: false };
  }
  
  // Debug method to help troubleshoot URLs
  debugImageUrl(attachment: any): void {
    const url = this.getFileUrl(attachment);
    // console.log('Debug image URL:', {
    //   attachment: attachment,
    //   constructedUrl: url,
    //   environment: environment,
    //   backendStaticPath: `${environment.apiUrl}/uploads/chat_files/`,
    //   filename: attachment.filename
    // });
    
    // Test if URL is accessible by making a HEAD request
    fetch(url, { method: 'HEAD' })
      .then(response => {
        // console.log('URL accessibility test:', {
        //   url: url,
        //   status: response.status,
        //   ok: response.ok,
        //   headers: Object.fromEntries(response.headers.entries())
        // });
      })
      .catch(error => {
        console.error('URL accessibility test failed:', {
          url: url,
          error: error
        });
      });
  }

  isImageFile(attachment: any): boolean {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(attachment.mimetype.toLowerCase());
  }

  isVideoFile(attachment: any): boolean {
    const videoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    return videoTypes.includes(attachment.mimetype.toLowerCase());
  }

  isAudioFile(attachment: any): boolean {
    const audioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    return audioTypes.includes(attachment.mimetype.toLowerCase());
  }

  isPdfFile(attachment: any): boolean {
    return attachment.mimetype.toLowerCase() === 'application/pdf';
  }

  isDocumentFile(attachment: any): boolean {
    const docTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    return docTypes.includes(attachment.mimetype.toLowerCase());
  }

  getFileIcon(attachment: any): string {
    if (this.isImageFile(attachment)) return 'fas fa-image';
    if (this.isVideoFile(attachment)) return 'fas fa-video';
    if (this.isAudioFile(attachment)) return 'fas fa-music';
    if (this.isPdfFile(attachment)) return 'fas fa-file-pdf';
    if (this.isDocumentFile(attachment)) return 'fas fa-file-word';
    return 'fas fa-file';
  }

  getFileIconColor(attachment: any): string {
    if (this.isImageFile(attachment)) return 'text-green-500';
    if (this.isVideoFile(attachment)) return 'text-blue-500';
    if (this.isAudioFile(attachment)) return 'text-purple-500';
    if (this.isPdfFile(attachment)) return 'text-red-500';
    if (this.isDocumentFile(attachment)) return 'text-blue-600';
    return 'text-gray-500';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadFile(attachment: any): void {
    const url = this.getFileUrl(attachment);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openFilePreview(attachment: any): void {
    const url = this.getFileUrl(attachment);
    window.open(url, '_blank');
  }

  onImageError(event: any, attachment?: any): void {
    // Handle image loading error by showing a fallback
    const img = event.target as HTMLImageElement;
    
    console.error('Image failed to load:', {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      attachment: attachment
    });
    
    // Update loading state if attachment provided
    if (attachment && attachment.filename) {
      const currentState = this.imageLoadingStates.get(attachment.filename);
      this.imageLoadingStates.set(attachment.filename, {
        ...currentState,
        loading: false,
        error: true,
        loaded: false
      });
    }
  }

  onImageLoad(event: any, attachment?: any): void {
    // Handle successful image loading
    const img = event.target as HTMLImageElement;
    // console.log('Image loaded successfully:', {
    //   src: img.src,
    //   naturalWidth: img.naturalWidth,
    //   naturalHeight: img.naturalHeight,
    //   dimensions: `${img.width}x${img.height}`,
    //   attachment: attachment
    // });
    
    // Ensure the image is visible and properly sized
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn('Image loaded but has no dimensions, treating as error');
      this.onImageError(event, attachment);
      return;
    }
    
    // Update loading state if attachment provided
    if (attachment && attachment.filename) {
      this.imageLoadingStates.set(attachment.filename, {
        loading: false,
        error: false,
        loaded: true
      });
    }
  }

  closeChat() {
    if (!this.currentChat) return;
    
    // Leave the current chat room
    this.realTimeService.leaveChat(this.currentChat._id);
    
    // Clear current chat state
    this.currentChat = null;
    this.messages = [];
    this.replyToMessage = null;
    this.selectedFiles = null;
    this.newMessageContent = '';
    
    // Clear image loading states
    this.imageLoadingStates.clear();
    
    // Reset scroll state
    this.isUserNearBottom = true;
    this.showJumpToLatest = false;
    this.newMessagesCount = 0;
    
    // Clear typing indicators
    this.typingUsers.clear();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    
    // Clear active chat in service
    this.chatService.setActiveChat(null);
  }

  // Hotkey close chat
  @HostListener('window:keydown', ['$event'])
  onHotkeyCloseChat(event: KeyboardEvent) {
    if(this.currentChat != null && event.key === 'Escape') {
      this.closeChat();
    }
    if(this.showFriendsList && event.key === 'Escape') {
      this.toggleFriendsList();
    }
    if(!this.showFriendsList && (event.key === 'f' || event.key === 'F') && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.toggleFriendsList();
    }
  }
}
