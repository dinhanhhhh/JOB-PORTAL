import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User, { type IUser } from "../models/User";
import { env } from "../utils/env";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails?.[0]?.value });

        if (user) {
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          email: profile.emails?.[0]?.value || "",
          name: profile.displayName || "",
          role: "seeker", // Default role
          isActive: true,
          // No password for OAuth users
        });

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user: IUser, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error, false);
  }
});

export default passport;
