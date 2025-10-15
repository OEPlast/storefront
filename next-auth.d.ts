// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  // Adding the new field to the User interface
  interface User extends DefaultUser {
    token: string;
  }

  // Here I add the user object to the session object so I can access it easily.
  interface Session extends DefaultSession {
    user: User;
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    token?: string;
  }
}
