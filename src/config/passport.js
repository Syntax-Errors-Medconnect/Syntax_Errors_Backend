const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const config = require('./env');

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: config.google.clientId,
            clientSecret: config.google.clientSecret,
            callbackURL: config.google.callbackUrl,
            passReqToCallback: true, // Pass request to callback to access state
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                // Get role from OAuth state parameter
                const role = req.query.state || 'patient'; // Default to patient if not specified

                // Validate role
                const validRole = ['doctor', 'patient'].includes(role) ? role : 'patient';

                // Check if user already exists with this Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    // User exists, return user (don't change role for existing users)
                    return done(null, user);
                }

                // Check if user exists with same email (link accounts)
                const email = profile.emails[0].value;
                user = await User.findOne({ email: email.toLowerCase() });

                if (user) {
                    // Link Google account to existing user (keep existing role)
                    user.googleId = profile.id;
                    user.authProvider = 'google';
                    user.profilePicture = profile.photos[0]?.value || null;
                    await user.save();
                    return done(null, user);
                }

                // Create new user with selected role
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: email.toLowerCase(),
                    authProvider: 'google',
                    profilePicture: profile.photos[0]?.value || null,
                    role: validRole, // Set role from OAuth state
                    isActive: true,
                });

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

module.exports = passport;
