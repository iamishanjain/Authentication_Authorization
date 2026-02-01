import { model, Model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: Boolean,
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPaswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
