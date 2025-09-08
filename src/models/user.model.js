import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import jwt from "jsonwebtoken";

const addressSchema = new Schema({
  label: { type: String, maxlength: 30 },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false },
});

const otpSchema = new Schema(
  {
    otpHash: { type: String },

    channel: { type: String, enum: ["sms", "email"] },

    expiresAt: { type: Date, index: true },

    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true, unique: false },

    refreshToken: { type: String, select: false },

    refreshExpiresAt: { type: Date, index: true },

    createdAt: { type: Date, default: Date.now },

    revoked: { type: Boolean, default: false },

    replacedBy: { type: String },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    fullname: {
      type: String,
      minlength: [3, "Name must have at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
        "Please enter a valid email",
      ],
    },

    emailVerified: { type: Boolean, default: false },

    secondaryEmail: { type: String, lowercase: true, trim: true },

    phone: {
      type: String,
      sparse: true,
      unique: true,
    },

    phoneVerified: { type: Boolean, default: false },

    password: {
      type: String,
      select: false,
    },

    otp: otpSchema,

    lastOtpSentAt: Date,

    otpRequestCount: { type: Number, default: 0, max: 20 },

    avatar: {
      public_id: String,
      url: String,
    },

    addresses: [addressSchema],

    marketingOptIn: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: true },
    },

    role: { type: String, enum: ["User", "Admin"], default: "User" },

    isBanned: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },

    sessions: [sessionSchema],

    loyaltyPoints: { type: Number, default: 0 },

    totalOrders: { type: Number, default: 0 },

    totalSpent: { type: Number, default: 0 },

    resetPassword: {
      tokenHash: String,
      expiresAt: Date,
      createdAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // remove sensitive fields from API output
        delete ret.password;
        delete ret.otp;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);


userSchema.methods.generateAccessToken = async function(sessionId){
  const payload = {
    sub: this._id,
    sid: sessionId,
    role: this.role,
    name: this.fullname
  }

  return await jwt.sign(payload, process.env.ACESS_TOKEN_SECRET, { expiresIn: process.env.ACESS_TOKEN_EXPIRY})
}

userSchema.methods.generateRefreshToken = async function(sessionId){
  const payload = {
    sub: this._id,
    sid: sessionId,
    role: this.role,
    name: this.fullname
  }

  return await jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });

}

userSchema.methods.createSession = async function(){
  const refreshToken = this.generateRefreshToken();

  const now = Date.now();
  const expires = new Date(now + (7 * 24 *  60 * 60 * 1000));

  const sessionId = crypto.randomBytes(12).toString("hex");

  const sessionObj = {
    sessionId,
    refreshToken,
    refreshExpiresAt : expires,
    createdAt: new Date(now),
    revoked: false,
    replacedBy: null

  }

  this.sessions = this.sessions || [];
  this.sessions.push(sessionObj);

  await this.save();

  return { refreshToken, sessionId, refreshExpiresAt: expires }
}


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = async function (password) {
  try {
    return bcrypt.compare(password, this.password);
  } catch (error) {
    throw error;
  }
};


export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
