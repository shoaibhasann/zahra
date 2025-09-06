import mongoose, { Schema } from "mongoose";


const enquirySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },

  phoneno: {
    type: String
  },

  message: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});


export const enquiryModel = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);

