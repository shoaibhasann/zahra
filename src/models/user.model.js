import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

// NOTE: This is schema-level only. Implement OTP generation, hashing, sending, and rate-limiting in your service layer.
// Also implement password hashing when you add password flow (bcrypt/argon2) in auth controller.

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

const otpSchema = new Schema({

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

    refreshHash: { type: String, select: false },

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
      required: [true, "Name is required"],
      minlength: [3, "Name must have at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    emailVerified: { type: Boolean, default: false },

    secondaryEmail: { type: String, lowercase: true, trim: true },

    phone: {
      type: String,
      sparse: true,
      unique: true,
      match: [
        /^\+\d{7,15}$/,
        "Phone must be in E.164 format (e.g. +919812345678)",
      ],
    },

    phoneVerified: { type: Boolean, default: false },

    password: {
      type: String,
      select: false,
      required: false,
    },

    otp: otpSchema,

    lastOtpSentAt: Date,

    failedOtpAttempts: { type: Number, default: 0, max: 6 },

    // Auth methods: helpful to know how this user authenticates
    authMethods: [
      {
        type: {
          type: String,
          enum: ["otp", "password", "google", "apple", "facebook"],
          required: true,
        },
        providerId: String, // e.g., google sub
      },
    ],

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

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

// Instance helper: create OTP hash (example - use HMAC with server secret or bcrypt)
userSchema.methods.createOtpHash = function (otpPlain) {
  // example HMAC - prefer a secret in process.env. For production, use a secure OTP service or bcrypt + short expiry.
  const secret = process.env.OTP_SECRET || "change_me";
  return crypto.createHmac("sha256", secret).update(otpPlain).digest("hex");
};

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
