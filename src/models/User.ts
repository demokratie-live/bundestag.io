import mongoose from 'mongoose';
import UserSchema, { IUser } from './../migrations/1-schemas/User';

export default mongoose.model<IUser>('User', UserSchema);
