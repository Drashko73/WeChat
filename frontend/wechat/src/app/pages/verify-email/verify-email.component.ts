import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { fadeIn, fadeInUp } from '../../animations/animations';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
  animations: [fadeIn, fadeInUp]
})
export class VerifyEmailComponent implements OnInit {
  verificationForm!: FormGroup;
  email: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  codeSent: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
        this.sendVerificationCode();
      }
    });

    this.verificationForm = this.fb.group({
      email: [this.email, [Validators.required, Validators.email]],
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  sendVerificationCode(): void {
    const email = this.verificationForm?.get('email')?.value || this.email;
    
    if (!email) {
      this.errorMessage = 'Please provide an email address';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendVerificationCode(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.codeSent = true;
        this.successMessage = 'Verification code has been sent to your email.';
        
        // Update email in form if it wasn't there
        if (this.verificationForm.get('email')?.value === '') {
          this.verificationForm.patchValue({ email });
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to send verification code. Please try again.';
      }
    });
  }

  verifyEmail(): void {
    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      return;
    }

    const { email, verificationCode } = this.verificationForm.value;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.confirmEmail(email, verificationCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Email verified successfully!';
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to verify email. Please check the verification code and try again.';
      }
    });
  }
}
