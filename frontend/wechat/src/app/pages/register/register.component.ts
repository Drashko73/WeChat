import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fadeIn, fadeInUp, staggerFadeIn } from '../../animations/animations';
import { ValidationService } from '../../services/validation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  animations: [fadeIn, fadeInUp, staggerFadeIn]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  selectedProfilePic: File | null = null;
  profilePicPreview: string | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    // First create the form without the password validators that need access to username
    this.registerForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.maxLength(255),
        Validators.pattern(/[A-Z][a-z]{1,}\s[A-Z][a-z]{1,}$/)
      ]],
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.maxLength(255),
        Validators.pattern(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
      ]],
      username: ['', [
        Validators.required, 
        Validators.minLength(4),
        Validators.maxLength(255),
        Validators.pattern(/^[A-Za-z0-9\_\.]+$/)
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.maxLength(50),
        ValidationService.validatePasswordStrength
      ]],
      confirmPassword: ['', [Validators.required]],
      termsAndConditions: [false, [Validators.requiredTrue]]
    }, { 
      validators: [
        ValidationService.passwordMatchValidator,
        ValidationService.passwordContainsUsernameValidator,
        ValidationService.passwordContainsFullNameValidator
      ]
    });
  }
  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const userData = {
        fullName: this.registerForm.value.fullName,
        email: this.registerForm.value.email,
        username: this.registerForm.value.username,
        password: this.registerForm.value.password
      };

      this.authService.register(userData, this.selectedProfilePic || undefined)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.successMessage = 'Registration successful! Please check your email to verify your account.';
            
            // Redirect to email verification page after a short delay
            setTimeout(() => {
              this.router.navigate(['/verify-email'], { 
                queryParams: { email: this.registerForm.value.email } 
              });
            }, 1500);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
            
            // If the error is related to validation or already existing user
            if (error.status === 400 || error.status === 409) {
              // Handle specific error cases if needed
            }
          }
        });
    } else {
      // Mark all fields as touched to trigger validation display
      Object.keys(this.registerForm.controls).forEach(field => {
        const control = this.registerForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }
  
  onProfilePicChange(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      this.selectedProfilePic = file;
      
      // Create a preview of the image
      const reader = new FileReader();
      reader.onload = (e) => {
        this.profilePicPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  clearProfilePic(): void {
    this.selectedProfilePic = null;
    this.profilePicPreview = null;
    
    // Reset the file input
    const fileInput = document.getElementById('profilePic') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}
