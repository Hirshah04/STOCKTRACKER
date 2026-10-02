const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  activityId: { type: String, required: true, unique: true },
  shopId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ["add", "sell", "damage", "remove", "update", "delete", "category_add", "category_update"]
  },
  itemId: { type: String, default: "" },
  itemName: { type: String, required: true },
  colour: { type: String, default: "N/A" },
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: "piece" },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  notes: { type: String, default: "" },
  location: { type: String, default: "Shop" },
  ragNumber: { type: String, default: "" }
}, {
  timestamps: true
});

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
