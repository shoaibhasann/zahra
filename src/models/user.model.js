import mongoose, { Schema } from "mongoose";

const userSchema = Schema({

});

export const UserModel = (mongoose.models.User) || mongoose.model("User", userSchema);