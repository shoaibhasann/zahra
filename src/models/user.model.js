import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { normalizeIndianPhoneNumber } from "@/helpers/validatePhone";
import jwt from "jsonwebtoken";
import { Truculenta } from "next/font/google";



const addressSchema = new Schema({
  label: { type: String, maxlength: 30 },
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true,
    match: [/^[a-zA-Z\s]+$/, "Name must only contain letters and spaces"],
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"],
  },
  line1: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 100,
    trim: true
  },
  line2: { type: String, maxlength: 100 },
  city: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true
  },
  state: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{6}$/, "Pincode must be a 6-digit number"],
  },
  country: {
    type: String,
    default: "India",
    trim: true,
    match: [/^[A-Za-z\s]+$/, "Country must only contain letters and spaces"],
  },
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

    addresses: [addressSchema],

    marketingOptIn: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: true },
    },

    role: { type: String, enum: ["User", "Admin"], default: "User" },

    isBanned: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },

    loyaltyPoints: { type: Number, default: 0 },

    totalOrders: { type: Number, default: 0 },

    totalSpent: { type: Number, default: 0 },

    pendingEmail: {
      value: {
        type: String,
        match: [
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/,
          "Please enter a valid email",
        ],
      },
      otpHash: String,
      expiresAt: Date,
      createdAt: Date,
    },

    pendingPhone: {
      value: {
        type: String,
      },
      otpHash: String,
      expiresAt: Date,
      createdAt: Date
    }

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



userSchema.methods.generateRefreshToken = function(){
  const payload = {
    sub: this._id,
    role: this.role,
    name: this.fullname || ""
  }

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });

}

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
