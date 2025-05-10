const config = require('../common/config');

function validateFullName(fullName) {
  const nameRegex = /^[A-Z][a-z]{1,}\s[A-Z][a-z]{1,}$/;

  return nameRegex.test(fullName);
}

function validateEmailAddress(email) {
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  return emailRegex.test(email);
}

function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_\.]+$/;

  return usernameRegex.test(username);
}

function validateVerificationCode(code) {
  const codeLength = config.VERIFICATION_CODE_LENGTH;
  const codeRegex = new RegExp(`^[0-9]{${codeLength}}$`);

  return codeRegex.test(code);
}

function validatePasswordResetCode(code) {
  const codeLength = config.PASSWORD_RESET_CODE_LENGTH || config.VERIFICATION_CODE_LENGTH;
  const codeRegex = new RegExp(`^[0-9]{${codeLength}}$`);

  return codeRegex.test(code);
}

function validatePassword(password, username = '', fullName = '') {
  // Check password length (8-50 characters)
  if (password.length < 8 || password.length > 50) {
    return false;
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }
  
  // Check that password doesn't contain parts of username (if provided)
  if (username && username.length >= 3) {
    const lowerPassword = password.toLowerCase();
    const lowerUsername = username.toLowerCase();
    
    if (lowerPassword.includes(lowerUsername)) {
      return false;
    }
  }
  
  // Check that password doesn't contain parts of fullName (if provided)
  if (fullName && fullName.length >= 3) {
    const lowerPassword = password.toLowerCase();
    const nameParts = fullName.toLowerCase().split(/\s+/);
    
    // Check each part of the name that's 3 or more characters
    for (const part of nameParts) {
      if (part.length >= 3 && lowerPassword.includes(part)) {
        return false;
      }
    }
  }
  
  return true;
}

module.exports = {
  validateFullName,
  validateEmailAddress,
  validateUsername,
  validateVerificationCode,
  validatePasswordResetCode,
  validatePassword,
}