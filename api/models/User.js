const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  name: { type: String, default: "", trim: true },
  email: { 
    type: String, 
    lowercase: true, 
    trim: true,
    default: null
  },
  username: { type: String, lowercase: true, trim: true }, // Preserved for backward compatibility
  phone: { type: String, default: "", trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ["owner", "partner", "staff"],
    default: "staff"
  },
  shopId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ["active", "disabled", "inactive"], 
    default: "active" 
  },
  activeSessionId: { type: String, default: null },
  // Password Reset / OTP Fields
  otpHash: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },
  resetTokenHash: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null }
}, {
  timestamps: true
});

// Enforce unique email index via partial filter expression so legacy accounts without email can exist safely
userSchema.index(
  { email: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { email: { $type: "string", $gt: "" } } 
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
