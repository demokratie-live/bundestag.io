/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'WEB', enum: ['WEB', 'BACKEND'] },
  },
  { timestamps: true },
);

UserSchema.methods = {
  createToken(res) {
    const token = jwt.sign(
      {
        _id: this._id,
      },
      process.env.AUTH_JWT_SECRET,
    );
    res.cookie('token', token);
    return token;
  },
};

export default mongoose.model('User', UserSchema);
