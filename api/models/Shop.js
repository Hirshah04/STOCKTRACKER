const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  ownerUsername: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
