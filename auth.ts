import APIRoutes from '@/libs/apiRoutes';
import client from '@/libs/dbClient';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import NextAuth, { AuthError, CredentialsSignin, Session, User } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

class InvalidLoginError extends CredentialsSignin {
  code = 'Invalid identifier or password';
}

class AccountNotFoundError extends AuthError {
  constructor() {
    super();
    this.message = 'Invalid credentials. Please sign up first.';
  }
}

class AuthenticationFailedError extends AuthError {
  constructor(message?: string) {
    super();
    this.message = message || 'Authentication failed';
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          // Return the default fields
          id: profile.sub,
          name: profile.name,
          dob: profile.dob,
          firstName: profile.given_name,
          lastname: profile.family_name,
          email: profile.email,
          image: profile.picture,
          country: profile.country,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials, request) {
        try {
          const response = await fetch(APIRoutes.login, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });
          if (!response.ok) {
            if (response.status === 401) {
              throw new InvalidLoginError();
            }
            return null;
          }

          const res = (await response.json()) as {
            message: string;
            data: {
              emailVerified: null | Date;
              token: string;
            } & User;
          };

          return res.data ?? null;
        } catch (error) {
          console.log('Error during credentials authorization:', error);
          if (error instanceof InvalidLoginError) {
            throw error;
          }
          throw new AuthenticationFailedError(
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      },
    }),
  ],
  adapter: MongoDBAdapter(client),
  session: { strategy: 'jwt' },

  callbacks: {
    // async signIn({ user, account, profile }) {
    //   if (account?.provider === 'google') {
    //     try {
    //       const response = await fetch(APIRoutes.providerLogin, {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({
    //           provider: account.provider,
    //           providerAccountId: account.providerAccountId,
    //         }),
    //       });

    //       const result = await response.json();
    //       console.log(result);

    //       if (!response.ok) {
    //         if (result.message === 'Account not found' || result.message === 'User not found') {
    //           throw new AccountNotFoundError();
    //         }
    //         throw new AuthenticationFailedError(result.message);
    //       }

    //       if (result.data?.token) {
    //         user.token = result.data.token;
    //         user.name = result.data.name;
    //         user.email = result.data.email;
    //         user.image = result.data.image;
    //         user.id = result.data._id;
    //         user.emailVerified = result.data.emailVerified
    //           ? new Date(result.data.emailVerified)
    //           : new Date();
    //       }

    //       return true;
    //     } catch (error) {
    //       console.error('Error during Google sign-in:', error);
    //       // Re-throw to let NextAuth handle it
    //       throw error;
    //     }
    //   }

    //   return true;
    // },
    async jwt({ token, user, account, trigger, session }) {
      // On initial sign-in with Google - fetch token from backend
      if (account?.provider === 'google') {
        try {
          const response = await fetch(APIRoutes.providerLogin, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }),
          });

          const result = await response.json();

          if (response.ok && result.data?.token) {
            // Use backend data, not user object from database
            token.id = result.data._id;
            token.token = result.data.token; // Real JWT token
            token.name = result.data.name;
            token.email = result.data.email;
            token.image = result.data.image;
            token.emailVerified = result.data.emailVerified
              ? new Date(result.data.emailVerified)
              : new Date();

            console.log('JWT callback - token set to:', result.data.token);
          }
        } catch (error) {
          console.error('Error fetching token in JWT callback:', error);
        }
      }
      // For credentials login
      else if (account?.provider === 'credentials' && user) {
        token.id = user.id;
        token.token = user.token;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.emailVerified = user.emailVerified;
      }

      if (trigger === 'update' && session) {
        token.emailVerified = session.user.emailVerified;
      }

      return token;
    },
    async session({ session, token }) {
      // Add data from JWT token to session
      if (token) {
        session.user.id = token.id as string;
        session.user.token = token.token as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        session.user.emailVerified = token.emailVerified as Date | null;
      }

      return session;
    },
  },
  events: {
    linkAccount: async ({ user, account }) => {
      if (account.provider === 'google') {
        try {
          await client
            .db()
            .collection('users')
            .updateOne({ _id: new ObjectId(user.id) }, { $set: { emailVerified: new Date() } });
          return;
        } catch (error) {
          // TODO: user a proper logging mechanism in production
          // Example: logger.error("Failed to link Google account", error);
        }
      }
    },
  },
  pages: {
    error: '/register',
    signIn: '/login',
  },
});
