import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { fadeIn, fadeInUp, staggerFadeIn } from '../../animations/animations';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  animations: [fadeIn, fadeInUp, staggerFadeIn]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/dashboard'; // Default redirect after login

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // If already logged in, redirect to returnUrl
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const { email, password, rememberMe } = this.loginForm.value;
      
      this.authService.login(email, password, rememberMe).subscribe({
        next: (response) => {
          if (response.access_token) {
            // Login successful
            this.router.navigateByUrl(this.returnUrl);
          } else {
            // Login failed with a response but no token
            this.errorMessage = response.message || 'Login failed. Please check your credentials.';
          }
          this.isLoading = false;
        },
        error: (error) => {
          // Handle error
          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (error.status === 400) {
            this.errorMessage = 'Invalid login data';
          } else {
            this.errorMessage = 'An error occurred during login. Please try again.';
          }
          this.isLoading = false;
        }
      });
    } else {
      // Mark all fields as touched to trigger validation display
      Object.keys(this.loginForm.controls).forEach(field => {
        const control = this.loginForm.get(field);
        control?.markAsTouched({ onlySelf: true });
      });
    }
  }
}
