const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stockId: { type: String, required: true, unique: true },
  shopId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  colour: { type: String, default: "N/A", trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { 
    type: String, 
    required: true, 
    enum: ["kg", "litre", "piece", "meter"],
    default: "piece",
    lowercase: true
  },
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  supplier: { type: String, default: "" },
  description: { type: String, default: "" },
  location: { type: String, default: "Shop" },
  ragNumber: { type: String, default: "" },
  minStock: { type: Number, default: 5 }
}, {
  timestamps: true
});

// Case-insensitive search index support
stockSchema.index({ name: 'text', category: 'text', colour: 'text' });

module.exports = mongoose.models.Stock || mongoose.model('Stock', stockSchema);
