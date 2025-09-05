const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/user');
const config = require('../common/config');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.JWT_SECRET_KEY,
  issuer: config.JWT_ISSUER,
  algorithms: [config.JWT_ALGORITHM]
};

// Create the JWT strategy for Passport
const jwtStrategy = new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Check if the user exists and is not deleted
    const user = await User.findById(payload.id);
    
    if (!user) {
      return done(null, false);
    }
    
    if (user.is_deleted || !user.email_confirmed) {
      return done(null, false);
    }
    
    // User is valid, pass it to the next middleware
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
});

// Initialize Passport and use the JWT strategy
const initializePassport = () => {
  passport.use(jwtStrategy);
  return passport;
};

module.exports = initializePassport;
