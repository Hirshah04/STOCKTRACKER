const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  shopId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  createdBy: { type: String, default: "system" }
}, {
  timestamps: true
});

// Index for shopId and product name
productSchema.index({ shopId: 1, name: 1 }, { unique: true });
productSchema.index({ shopId: 1, category: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
