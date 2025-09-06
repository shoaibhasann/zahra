import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

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

userSchema.methods.createOtpHash = function (otpPlain) {
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

userSchema.methods.generateOtp = async function (
  channel = "sms",
  ttlSeconds = 600
) {
  const plainOtp = String(Math.floor(Math.random() * 900000 + 100000));
  const otpHash = this.createOtpHash(plainOtp);
  const expires = new Date(Date.now() + ttlSeconds * 1000);

  this.otp = {
    otpHash,
    channel,
    expiresAt: expires,
    createdAt: new Date(),
  };

  this.lastOtpSentAt = new Date();
  this.failedOtpAttempts = 0;

  return otp;
};

userSchema.methods.verifyOtp = async function (plainOtp) {
  if (!this.otp || !this.otp.otpHash) {
    return {
      success: false,
      message: "no_otp",
    };
  }

  if (this.otp.expiresAt < new Date()) {
    return {
      success: false,
      messgae: "otp_expired",
    };
  }

  const storedHex = this.otp.otpHash;
  const candidateHex = this.createOtpHash(plainOtp);

  let match = false;

  try {
    const a = Buffer.from(storedHex, "hex");
    const b = Buffer.from(candidateHex, "hex");

    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      match = true;
    }
  } catch (error) {
    match = false;
    throw error;
  }

  if (!match) {
    this.failedOtpAttempts = (this.failedOtpAttempts || 0) + 1;
    await this.save();

    if (this.failedOtpAttempts >= 6) {
      return {
        success: false,
        message: "Otp creation range exceeded",
      };
    }

    return {
      success: false,
      message: "invalid",
    };
  }

  const verifiedChannel = this.otp.channel;

  this.otp = undefined;
  this.failedOtpAttempts = 0;

  if (verifiedChannel === "sms") this.phoneVerified = true;
  if (verifiedChannel === "email") this.emailVerified = true;

  await this.save();

  return { sucess: true, message: "otp verified successfully" };
};

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
