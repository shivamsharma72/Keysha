import { Document, Model } from 'mongoose';
/**
 * User Model - MongoDB Schema
 *
 * This defines the structure of user documents in MongoDB.
 * Think of it like a blueprint for a house - it specifies what
 * rooms (fields) exist and what they can contain.
 *
 * Why store refresh token? It's long-lived and needed to get new
 * Google access tokens. We encrypt it before storing (see encryption.ts).
 */
export interface IUser extends Document {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    refreshToken: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const User: Model<IUser>;
export default User;
//# sourceMappingURL=User.d.ts.map