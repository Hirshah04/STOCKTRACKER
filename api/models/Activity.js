const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  activityId: { type: String, required: true, unique: true },
  shopId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ["product_add", "add", "sell", "damage", "remove", "update", "delete"]
  },
  productId: { type: String, default: "", index: true },
  itemId: { type: String, default: "", index: true },
  itemName: { type: String, required: true },
  category: { type: String, default: "" },
  colour: { type: String, default: "N/A" },
  customColour: { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  unit: { 
    type: String, 
    default: "piece",
    enum: ["kg", "litre", "piece", "meter", "set"]
  },
  price: { type: Number, default: null },
  brandName: { type: String, default: "" },
  buyDate: { type: Date, default: null },
  saleDate: { type: Date, default: null },
  transactionType: { type: String, default: "" },
  billNo: { type: String, default: "" },
  challanNo: { type: String, default: "" },
  user: { type: String, required: true },
  role: { type: String, default: "owner" },
  timestamp: { type: Date, default: Date.now, index: true },
  notes: { type: String, default: "" },
  location: { type: String, default: "Shop" },
  ragNumber: { type: String, default: "" }
}, {
  timestamps: true
});

activitySchema.index({ shopId: 1, timestamp: -1 });
activitySchema.index({ shopId: 1, itemId: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
