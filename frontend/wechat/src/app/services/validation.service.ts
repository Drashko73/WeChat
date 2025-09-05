import { Injectable } from "@angular/core";
import { AbstractControl, ValidationErrors } from "@angular/forms";

@Injectable({
  providedIn: "root",
})
export class ValidationService {

  constructor() {}

  // Static methods that can be used directly in form validators
  static validatePasswordStrength(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    
    if (!password) {
      return null;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
    
    return passwordValid ? null : { 'weakPassword': true };
  }

  static passwordContainsUsernameValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const username = control.get('username');
    
    if (!password || !username || username.value.length < 3) {
      return null;
    }
    
    const lowerPassword = password.value.toLowerCase();
    const lowerUsername = username.value.toLowerCase();
    
    return lowerPassword.includes(lowerUsername) ? { 'passwordContainsUsername': true } : null;
  }

  static passwordContainsFullNameValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const fullName = control.get('fullName');
    
    if (!password || !fullName || !fullName.value) {
      return null;
    }
    
    const lowerPassword = password.value.toLowerCase();
    const nameParts = fullName.value.toLowerCase().split(' ');
    
    // Check if any part of the name is included in the password
    for (const part of nameParts) {
      if (part.length >= 3 && lowerPassword.includes(part)) {
        return { 'passwordContainsFullName': true };
      }
    }
    
    return null;
  }

  static passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { 'passwordMismatch': true };
  }

  // Instance methods that can be used when injected
  validatePasswordStrength = ValidationService.validatePasswordStrength;
  passwordContainsUsernameValidator = ValidationService.passwordContainsUsernameValidator;
  passwordContainsFullNameValidator = ValidationService.passwordContainsFullNameValidator;
  passwordMatchValidator = ValidationService.passwordMatchValidator;
}