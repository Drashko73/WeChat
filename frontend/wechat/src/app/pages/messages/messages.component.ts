import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { ChatService, Chat, ChatMessage, SendMessageRequest } from '../../services/chat.service';
import { FriendService, Friend } from '../../services/friend.service';
import { RealTimeService } from '../../services/real-time.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';

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
    private route: ActivatedRoute
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
}
