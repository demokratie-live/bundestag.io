/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';

import CONFIG from './../../config';
import { Response } from 'express';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'WEB' | 'BACKEND';

  // methods
  createToken: (res: Response) => string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'WEB', enum: ['WEB', 'BACKEND'] },
  },
  { timestamps: true },
);

UserSchema.methods.createToken = function (res) {
  const token = jwt.sign(
    {
      _id: this._id,
    },
    CONFIG.AUTH_JWT_SECRET,
  );
  res.cookie('token', token);
  return token;
};

export default UserSchema;
