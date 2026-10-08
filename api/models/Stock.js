const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stockId: { type: String, required: true, unique: true },
  shopId: { type: String, required: true, index: true },
  productId: { type: String, index: true, default: "" },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  colour: { type: String, default: "N/A", trim: true },
  customColour: { type: String, default: "", trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { 
    type: String, 
    required: true, 
    enum: ["kg", "litre", "piece", "meter", "set"],
    default: "piece",
    lowercase: true
  },
  price: { type: Number, default: null, min: 0 },
  brandName: { type: String, default: "", trim: true },
  buyDate: { type: Date, default: null },
  transactionType: {
    type: String,
    enum: ["bill", "challan", "cash", ""],
    default: "",
    lowercase: true
  },
  billNo: { type: String, default: "", trim: true },
  challanNo: { type: String, default: "", trim: true },
  location: { type: String, default: "Shop" },
  ragNumber: { type: String, default: "" },
  minStock: { type: Number, default: 5 },
  createdBy: { type: String, default: "system" }
}, {
  timestamps: true
});

// Indexes for searching, filtering, and performance
stockSchema.index({ shopId: 1, productId: 1 });
stockSchema.index({ shopId: 1, category: 1 });
stockSchema.index({ shopId: 1, colour: 1 });
stockSchema.index({ shopId: 1, createdAt: -1 });
stockSchema.index({ name: 'text', category: 'text', colour: 'text', brandName: 'text' });

module.exports = mongoose.models.Stock || mongoose.model('Stock', stockSchema);
