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

module.exports = {
  validateFullName,
  validateEmailAddress,
  validateUsername
}