const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: "", trim: true },
  email: { type: String, default: "", trim: true },
  ownerEmail: { type: String, default: "", lowercase: true, trim: true },
  ownerUsername: { type: String, default: "" }
}, {
  timestamps: true
});

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
