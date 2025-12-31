import { ShopItem } from '../models/ShopItem.js';
import { User } from '../models/User.js';

async function ensureShopSeed() {
  const count = await ShopItem.countDocuments({});
  if (count === 0) {
    await ShopItem.insertMany([
      { itemId: 'power-5050', name: '50/50', description: 'Remove two wrong options once per quiz', type: 'power-up', price: 50, payload: { powerUpType: '5050', uses: 1 } },
      { itemId: 'power-time', name: 'Time Freeze', description: 'Add 20s once per quiz', type: 'power-up', price: 60, payload: { powerUpType: 'time_freeze', uses: 1 } },
      { itemId: 'boost-xp', name: 'XP Boost', description: '1.5x XP for next quiz', type: 'boost', price: 80, payload: { boost: 'xp', multiplier: 1.5 } },
    ]);
  }
}

export const getShopItems = async (req, res) => {
  try {
    await ensureShopSeed();
    const items = await ShopItem.find({}).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shop items', error: error.message });
  }
};

export const createShopItem = async (req, res) => {
  try {
    const data = req.body;
    if (!data.name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Auto-generate itemId if not provided
    if (!data.itemId) {
        data.itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    const created = await ShopItem.create(data);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Error creating shop item', error: error.message });
  }
};

export const updateShopItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updated = await ShopItem.findOneAndUpdate({ itemId }, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Item not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shop item', error: error.message });
  }
};

export const deleteShopItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const deleted = await ShopItem.findOneAndDelete({ itemId });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting shop item', error: error.message });
  }
};

export const purchaseItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = await ShopItem.findOne({ itemId }).lean();
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const user = await User.findOne({ userId: req.user.userId }); // Re-fetch to ensure sync, or use req.user (might be stale if not careful, but generally ok)
    // Using req.user might mean we manipulate the object attached to request. 
    // Mongoose documents attached to req.user are 'live' if not lean(). verifyUser uses findOne without lean().
    // So req.user is a Mongoose document.
    
    const coins = user.coins || 0;
    if (coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' });
    }

    user.coins = coins - item.price;
    const inv = user.inventory || [];
    
    // For power-ups, also add to powerUps list
    if (item.type === 'power-up' && item.payload?.powerUpType) {
      const pList = user.powerUps || [];
      const idx = pList.findIndex(p => p.type === item.payload.powerUpType);
      if (idx >= 0) {
        pList[idx].quantity += item.payload.uses || 1;
      } else {
        pList.push({ type: item.payload.powerUpType, quantity: item.payload.uses || 1 });
      }
      user.powerUps = pList;
    }

    const existing = inv.find((i) => i.itemId === itemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      inv.push({ itemId, quantity: 1 });
    }
    user.inventory = inv;
    await user.save();

    res.json({ message: 'Purchased', coins: user.coins, inventory: user.inventory });
  } catch (error) {
    res.status(500).json({ message: 'Error purchasing item', error: error.message });
  }
};
