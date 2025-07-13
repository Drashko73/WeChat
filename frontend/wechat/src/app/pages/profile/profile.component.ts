import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { ProfilePictureComponent } from '../../components/profile-picture/profile-picture.component';
import { fadeIn } from '../../animations/animations';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProfilePictureComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  animations: [fadeIn]
})
export class ProfileComponent implements OnInit {
  currentUser$: Observable<User | null>;
  profileForm: FormGroup;
  isLoading = false;
  isUpdating = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.currentUser$ = this.authService.currentUser;
    this.profileForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    this.userService.getCurrentUserProfile().subscribe({
      next: (user: UserProfile) => {
        if (user) {
          this.profileForm.patchValue({
            full_name: user.full_name
          });
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading user profile:', error);
        this.notificationService.showError('Failed to load profile information');
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.notificationService.showError('Please select an image file');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.showError('File size must be less than 5MB');
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    // Reset file input
    const fileInput = document.getElementById('profile-picture-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.isUpdating = true;
      
      const formData = new FormData();
      const fullName = this.profileForm.get('full_name')?.value?.trim();
      
      if (fullName) {
        formData.append('full_name', fullName);
      }
      
      if (this.selectedFile) {
        formData.append('profile_picture', this.selectedFile);
      }

      this.userService.updateProfile(formData).subscribe({
        next: (response: UserProfile) => {
          this.notificationService.showSuccess('Profile updated successfully!');
          
          // Update current user in auth service
          this.authService.updateCurrentUser(response);
          
          // Clear selected file and preview
          this.clearSelectedFile();
          
          this.isUpdating = false;
        },
        error: (error: any) => {
          console.error('Error updating profile:', error);
          const errorMessage = error.error?.error || 'Failed to update profile';
          this.notificationService.showError(errorMessage);
          this.isUpdating = false;
        }
      });
    } else {
      this.notificationService.showError('Please fill in all required fields correctly');
    }
  }

  hasChanges(): boolean {
    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) return false;

    const fullNameChanged = this.profileForm.get('full_name')?.value?.trim() !== currentUser.fullName;
    const pictureSelected = this.selectedFile !== null;

    return fullNameChanged || pictureSelected;
  }

  resetForm(): void {
    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser) {
      this.profileForm.patchValue({
        full_name: currentUser.fullName
      });
    }
    this.clearSelectedFile();
  }
}
