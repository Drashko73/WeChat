import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // Duration in milliseconds
  action?: {
    label: string;
    callback: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  private dismissSubject = new Subject<string>(); // Subject for dismissing notifications

  public notification$ = this.notificationSubject.asObservable();
  public dismiss$ = this.dismissSubject.asObservable();

  constructor() {}

  /**
   * Show a notification
   * @param title - The notification title
   * @param message - The notification message
   * @param type - The notification type (info, success, warning, error)
   * @param duration - How long to show the notification (ms)
   * @param action - Optional action with label and callback
   */
  show(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 5000,
    action?: { label: string; callback: () => void }
  ): string {
    const id = this.generateId();
    
    this.notificationSubject.next({
      id,
      title,
      message,
      type,
      duration,
      action
    });
    
    return id;
  }

  /**
   * Show an info notification
   */
  info(title: string, message: string, duration?: number, action?: { label: string; callback: () => void }): string {
    return this.show(title, message, 'info', duration, action);
  }

  /**
   * Show a success notification
   */
  success(title: string, message: string, duration?: number, action?: { label: string; callback: () => void }): string {
    return this.show(title, message, 'success', duration, action);
  }

  /**
   * Show a warning notification
   */
  warning(title: string, message: string, duration?: number, action?: { label: string; callback: () => void }): string {
    return this.show(title, message, 'warning', duration, action);
  }

  /**
   * Show an error notification
   */
  error(title: string, message: string, duration?: number, action?: { label: string; callback: () => void }): string {
    return this.show(title, message, 'error', duration, action);
  }

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string): void {
    this.dismissSubject.next(id);
  }

  /**
   * Generate a unique ID for a notification
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
