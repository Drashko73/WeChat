import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService, Notification } from '../../services/notification.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styles: [`
    @keyframes shrinkWidth {
      from { width: 100%; }
      to { width: 0%; }
    }
  `],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscriptions = new Subscription();
  private timeouts: { [id: string]: any } = {};

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Subscribe to new notifications
    this.subscriptions.add(
      this.notificationService.notification$.subscribe(notification => {
        this.notifications.push(notification);
        
        // Auto dismiss after duration
        if (notification.duration) {
          this.timeouts[notification.id] = setTimeout(() => {
            this.dismiss(notification.id);
          }, notification.duration);
        }
      })
    );

    // Subscribe to dismiss notifications
    this.subscriptions.add(
      this.notificationService.dismiss$.subscribe(id => {
        this.dismissById(id);
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and timeouts
    this.subscriptions.unsubscribe();
    
    // Clear any remaining timeouts
    Object.values(this.timeouts).forEach(timeout => clearTimeout(timeout));
  }

  /**
   * Handle action button click
   */
  onActionClick(notification: Notification): void {
    if (notification.action && notification.action.callback) {
      notification.action.callback();
    }
    this.dismiss(notification.id);
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    this.dismissById(id);
  }

  /**
   * Dismiss notification by ID
   */
  private dismissById(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      this.notifications.splice(index, 1);
      
      // Clear timeout if exists
      if (this.timeouts[id]) {
        clearTimeout(this.timeouts[id]);
        delete this.timeouts[id];
      }
    }
  }
}
