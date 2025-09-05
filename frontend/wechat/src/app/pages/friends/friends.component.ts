import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FriendService, Friend, FriendRequest, PaginatedResponse } from '../../services/friend.service';
import { UserService, UserSearchResult } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { RealTimeService } from '../../services/real-time.service';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ProfilePictureComponent],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms', style({ opacity: 1 })),
      ]),
    ]),
  ]
})
export class FriendsComponent implements OnInit, OnDestroy {
  // Tab management
  activeTab: 'friends' | 'requests' | 'discover' = 'friends';
  requestDirection: 'incoming' | 'outgoing' = 'incoming';
  
  // Friends list
  friends: Friend[] = [];
  loading = false;
  friendsPagination?: PaginatedResponse<Friend>;
  searchForm: FormGroup;
  
  // Friend requests
  incomingRequests: FriendRequest[] = [];
  outgoingRequests: FriendRequest[] = [];
  loadingRequests = false;
  incomingPagination?: PaginatedResponse<FriendRequest>;
  outgoingPagination?: PaginatedResponse<FriendRequest>;
  
  // Discover users
  discoveredUsers: any[] = [];
  searchingUsers = false;
  searchPerformed = false;
  discoverForm: FormGroup;
  discoverPagination?: PaginatedResponse<any>;
  
  // Send request modal
  showSendRequestModal = false;
  selectedUser: any = null;
  requestForm: FormGroup;
  sendingRequest = false;
  
  private subscriptions = new Subscription();

  constructor(
    private friendService: FriendService,
    private userService: UserService,
    private notificationService: NotificationService,
    private realTimeService: RealTimeService,
    private formBuilder: FormBuilder
  ) {
    this.searchForm = this.formBuilder.group({
      search: ['']
    });
    
    this.discoverForm = this.formBuilder.group({
      searchTerm: ['', [Validators.required, Validators.minLength(2)]]
    });
    
    this.requestForm = this.formBuilder.group({
      message: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    // Load initial data
    this.loadFriends();
    this.loadRequests('incoming');
    this.loadRequests('outgoing');
    
    // Sync online users when component initializes
    this.realTimeService.syncOnlineUsers();
    
    // Subscribe to search term changes for friends list
    this.subscriptions.add(
      this.searchForm.get('search')?.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(value => {
          this.loadFriends(1, value);
        })
    );
    
    // Subscribe to real-time events
    this.subscriptions.add(
      this.friendService.newFriendRequest$.subscribe(request => {
        // Add to incoming requests if not already there
        if (!this.incomingRequests.some(r => r.id === request.id)) {
          this.incomingRequests.unshift(request);
        }
        // Update discovered user status
        this.updateDiscoveredUserStatus(request.sender.id, 'request-received');
      })
    );
    
    this.subscriptions.add(
      this.friendService.friendRequestAccepted$.subscribe(friend => {
        // Add to friends list if not already there
        if (!this.friends.some(f => f.id === friend.id)) {
          this.friends.unshift(friend);
        }
        // Remove from outgoing requests if it exists
        this.outgoingRequests = this.outgoingRequests.filter(r => r.receiver.id !== friend.id);
        // Update discovered user status
        this.updateDiscoveredUserStatus(friend.id, 'friends');
      })
    );

    this.subscriptions.add(
      this.friendService.friendRequestRejected$.subscribe(requestId => {
        // Remove from outgoing requests
        const rejectedRequest = this.outgoingRequests.find(r => r.id === requestId);
        this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== requestId);
        // Update discovered user status if we know who rejected it
        if (rejectedRequest) {
          this.updateDiscoveredUserStatus(rejectedRequest.receiver.id, 'none');
        }
      })
    );

    this.subscriptions.add(
      this.friendService.friendRequestCancelled$.subscribe(request => {
        // Remove from incoming requests
        this.incomingRequests = this.incomingRequests.filter(r => r.id !== request.id);
        // Update discovered user status
        this.updateDiscoveredUserStatus(request.sender.id, 'none');
      })
    );

    this.subscriptions.add(
      this.friendService.friendRemoved$.subscribe(data => {
        // Remove the friend from friends list
        this.friends = this.friends.filter(f => f.id !== data.removedById);
        // Update discovered user status
        this.updateDiscoveredUserStatus(data.removedById, 'none');
        // Refresh requests since they might have been removed
        this.refreshRequests();
      })
    );

    this.subscriptions.add(
      this.friendService.friendRemovalConfirmed$.subscribe(data => {
        // Remove the friend from friends list (confirmation for the user who removed)
        this.friends = this.friends.filter(f => f.id !== data.removedFriendId);
        // Update discovered user status
        this.updateDiscoveredUserStatus(data.removedFriendId, 'none');
        // Refresh requests since they might have been removed
        this.refreshRequests();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load friends list with optional search and pagination
   */
  loadFriends(page: number = 1, search?: string): void {
    this.loading = true;
    
    this.friendService.getFriends(page, 10, search).subscribe({
      next: (response) => {
        this.friends = response.data;
        this.friendsPagination = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading friends:', error);
        this.notificationService.error('Error', 'Failed to load friends list');
        this.loading = false;
      }
    });
  }

  /**
   * Load friend requests (incoming or outgoing) with pagination
   */
  loadRequests(direction: 'incoming' | 'outgoing', page: number = 1): void {
    this.loadingRequests = true;
    
    this.friendService.getFriendRequests(page, 10, direction).subscribe({
      next: (response) => {
        if (direction === 'incoming') {
          this.incomingRequests = response.data;
          this.incomingPagination = response;
        } else {
          this.outgoingRequests = response.data;
          this.outgoingPagination = response;
        }
        this.loadingRequests = false;
      },
      error: (error) => {
        console.error(`Error loading ${direction} requests:`, error);
        this.notificationService.error('Error', `Failed to load ${direction} friend requests`);
        this.loadingRequests = false;
      }
    });
  }

  /**
   * Search for users in the discover tab
   */
  searchUsers(page: number = 1): void {
    if (this.discoverForm.invalid) {
      return;
    }
    
    const searchTerm = this.discoverForm.get('searchTerm')?.value;
    this.searchingUsers = true;
    this.searchPerformed = true;
    
    this.userService.searchUsers(searchTerm, page, 10).subscribe({
      next: (response) => {
        this.discoveredUsers = response.data;
        this.discoverPagination = response;
        this.searchingUsers = false;
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.notificationService.error('Error', 'Failed to search users');
        this.searchingUsers = false;
      }
    });
  }

  /**
   * Open modal to send a friend request
   */
  openSendRequestModal(user: any): void {
    this.selectedUser = user;
    this.requestForm.reset();
    this.showSendRequestModal = true;
  }

  /**
   * Close the send request modal
   */
  closeSendRequestModal(): void {
    this.showSendRequestModal = false;
    this.selectedUser = null;
  }

  /**
   * Send a friend request
   */
  sendFriendRequest(): void {
    if (!this.selectedUser) {
      return;
    }
    
    this.sendingRequest = true;
    const message = this.requestForm.get('message')?.value || '';
    
    this.friendService.sendFriendRequest(this.selectedUser.id, message).subscribe({
      next: (response) => {
        this.notificationService.success('Success', 'Friend request sent successfully');
        
        // Update the discovered user's status
        const index = this.discoveredUsers.findIndex(u => u.id === this.selectedUser?.id);
        if (index !== -1) {
          this.discoveredUsers[index].friendStatus = 'request-sent';
        }
        
        // Add to outgoing requests
        if (response.data) {
          this.outgoingRequests.unshift(response.data);
        }
        
        this.sendingRequest = false;
        this.closeSendRequestModal();
      },
      error: (error) => {
        console.error('Error sending friend request:', error);
        this.notificationService.error('Error', 'Failed to send friend request');
        this.sendingRequest = false;
      }
    });
  }

  /**
   * Respond to a friend request (accept or reject)
   */
  respondToRequest(requestId: string, action: 'accept' | 'reject'): void {
    this.friendService.respondToFriendRequest(requestId, action).subscribe({
      next: (response) => {
        // Remove from incoming requests
        this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId);
        
        if (action === 'accept') {
          this.notificationService.success('Success', 'Friend request accepted');
          
          // Refresh friends list to include the new friend
          this.loadFriends();
        } else {
          this.notificationService.info('Success', 'Friend request rejected');
        }
      },
      error: (error) => {
        console.error(`Error ${action}ing friend request:`, error);
        this.notificationService.error('Error', `Failed to ${action} friend request`);
      }
    });
  }

  /**
   * Cancel a sent friend request
   */
  cancelRequest(requestId: string): void {
    this.friendService.cancelFriendRequest(requestId).subscribe({
      next: (response) => {
        // Remove from outgoing requests
        this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== requestId);
        this.notificationService.info('Success', 'Friend request canceled');
      },
      error: (error) => {
        console.error('Error canceling friend request:', error);
        this.notificationService.error('Error', 'Failed to cancel friend request');
      }
    });
  }

  /**
   * Remove a friend
   */
  removeFriend(friendId: string): void {
    this.friendService.removeFriend(friendId).subscribe({
      next: (response) => {
        // Don't manually remove from friends list - will be handled by WebSocket notification
        this.notificationService.success('Success', 'Friend removed');
      },
      error: (error) => {
        console.error('Error removing friend:', error);
        this.notificationService.error('Error', 'Failed to remove friend');
      }
    });
  }

  /**
   * Accept a friend request by user ID (for discover tab)
   */
  acceptRequestByUserId(userId: string): void {
    // Find the request ID from incoming requests
    const request = this.incomingRequests.find(r => r.sender.id === userId);
    if (request) {
      this.respondToRequest(request.id, 'accept');
      
      // Update the discovered user's status
      const index = this.discoveredUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        this.discoveredUsers[index].friendStatus = 'friends';
      }
    }
  }

  /**
   * Reject a friend request by user ID (for discover tab)
   */
  rejectRequestByUserId(userId: string): void {
    // Find the request ID from incoming requests
    const request = this.incomingRequests.find(r => r.sender.id === userId);
    if (request) {
      this.respondToRequest(request.id, 'reject');
      
      // Update the discovered user's status
      const index = this.discoveredUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        this.discoveredUsers[index].friendStatus = 'none';
      }
    }
  }

  /**
   * Cancel a friend request by user ID (for discover tab)
   */
  cancelRequestByUserId(userId: string): void {
    // Find the request ID from outgoing requests
    const request = this.outgoingRequests.find(r => r.receiver.id === userId);
    if (request) {
      this.cancelRequest(request.id);
      
      // Update the discovered user's status
      const index = this.discoveredUsers.findIndex(u => u.id === userId);
      if (index !== -1) {
        this.discoveredUsers[index].friendStatus = 'none';
      }
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString();
    }
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(total: number): number[] {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.realTimeService.isUserOnline(userId);
  }

  /**
   * Get user online status display text
   */
  getUserStatusText(friend: Friend): string {
    if (this.isUserOnline(friend.id)) {
      return 'Online';
    }
    if (friend.lastSeen) {
      const lastSeen = new Date(friend.lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        const diffHours = Math.floor(diffMinutes / 60);
        return `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffMinutes / 1440);
        return `${diffDays}d ago`;
      }
    }
    return 'Offline';
  }

  /**
   * Update discovered user friendship status
   */
  private updateDiscoveredUserStatus(userId: string, newStatus: 'none' | 'friends' | 'request-sent' | 'request-received') {
    const index = this.discoveredUsers.findIndex(u => u.id === userId);
    if (index !== -1) {
      this.discoveredUsers[index].friendStatus = newStatus;
    }
  }

  /**
   * Refresh friend requests (useful when relationships change)
   */
  refreshRequests(): void {
    this.loadRequests('incoming');
    this.loadRequests('outgoing');
  }
}
