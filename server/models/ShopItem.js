import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['power-up', 'cosmetic', 'boost'], default: 'power-up' },
  price: { type: Number, required: true, default: 0 },
  payload: { type: Object, default: {} }, // e.g., { powerUpType: '5050', uses: 1 }
  createdAt: { type: Date, default: Date.now }
});

export const ShopItem = mongoose.model('ShopItem', shopItemSchema);
