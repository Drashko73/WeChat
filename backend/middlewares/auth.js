const passport = require('passport');

// Middleware to authenticate using JWT strategy
exports.authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Add the authenticated user to the request object
    req.user = user;
    return next();
  })(req, res, next);
};

// Optional: Role-based authorization middleware
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // This can be expanded later when roles are added to the user model
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    
    return next();
  };
};
