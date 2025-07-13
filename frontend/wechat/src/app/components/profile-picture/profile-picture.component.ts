import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-picture',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative overflow-hidden"
      [ngClass]="containerClasses"
    >
      <img 
        *ngIf="profilePictureUrl && !imageError" 
        [src]="profilePictureUrl" 
        [alt]="fullName + ' profile picture'"
        class="w-full h-full object-cover"
        (error)="onImageError()"
        (load)="onImageLoad()"
      />
      <div 
        *ngIf="!profilePictureUrl || imageError"
        class="w-full h-full flex items-center justify-center text-white font-bold"
        [ngClass]="placeholderClasses"
        [style.font-size]="fontSize"
      >
        {{ getInitials() }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class ProfilePictureComponent {
  @Input() profilePicture: string | null | undefined = null;
  @Input() fullName: string = '';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() shape: 'circle' | 'square' | 'rounded' = 'circle';

  imageError = false;

  constructor(private authService: AuthService) {}

  get profilePictureUrl(): string | null {
    return this.authService.getProfilePictureUrl(this.profilePicture);
  }

  get containerClasses(): string {
    const sizeClasses = {
      'xs': 'w-6 h-6',
      'sm': 'w-8 h-8',
      'md': 'w-12 h-12',
      'lg': 'w-16 h-16',
      'xl': 'w-20 h-20'
    };

    const shapeClasses = {
      'circle': 'rounded-full',
      'square': '',
      'rounded': 'rounded-md'
    };

    return `${sizeClasses[this.size]} ${shapeClasses[this.shape]}`;
  }

  get placeholderClasses(): string {
    return 'bg-indigo-600 dark:bg-indigo-500';
  }

  get fontSize(): string {
    const fontSizes = {
      'xs': '0.5rem',
      'sm': '0.75rem',
      'md': '1rem',
      'lg': '1.25rem',
      'xl': '1.5rem'
    };
    return fontSizes[this.size];
  }

  getInitials(): string {
    if (!this.fullName) {
      return 'U';
    }
    
    const nameParts = this.fullName.trim().split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  }

  onImageError(): void {
    this.imageError = true;
  }

  onImageLoad(): void {
    this.imageError = false;
  }
}
