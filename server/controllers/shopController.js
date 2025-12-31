import { ShopItem } from '../models/ShopItem.js';
import { User } from '../models/User.js';

async function ensureShopSeed() {
  const defaultItems = [
    // Power-Ups
    { itemId: 'power-5050', name: '50/50', description: 'Remove two wrong options', type: 'power-up', price: 50, payload: { powerUpType: '5050', uses: 1 } },
    { itemId: 'power-time', name: 'Time Freeze', description: 'Freeze time for 30s', type: 'power-up', price: 60, payload: { powerUpType: 'time_freeze', uses: 1 } },
    { itemId: 'power-skip', name: 'Question Skip', description: 'Skip a hard question', type: 'power-up', price: 100, payload: { powerUpType: 'skip', uses: 1 } },
    { itemId: 'power-shield', name: 'Streak Shield', description: 'Protect your streak once', type: 'power-up', price: 150, payload: { powerUpType: 'shield', uses: 1 } },
    { itemId: 'power-hint', name: 'Smart Hint', description: 'Get a helpful hint', type: 'power-up', price: 75, payload: { powerUpType: 'hint', uses: 1 } },
    
    // Boosts
    { itemId: 'boost-xp', name: 'XP Boost', description: '2x XP for next quiz', type: 'boost', price: 120, payload: { boost: 'xp', multiplier: 2.0 } },
    
    // Cosmetics - Hats/Head
    { itemId: 'style-glasses', name: 'Cool Glasses', description: 'Look smart while quizzing', type: 'cosmetic', price: 200, payload: { cosmeticType: 'accessory', value: 'glasses' } },
    { itemId: 'style-crown', name: 'Golden Crown', description: 'For the quiz royalty', type: 'cosmetic', price: 1000, payload: { cosmeticType: 'hat', value: 'crown' } },
    { itemId: 'style-wizard', name: 'Wizard Hat', description: 'Magical knowledge inside', type: 'cosmetic', price: 500, payload: { cosmeticType: 'hat', value: 'wizard_hat' } },
    
    // Cosmetics - Themes/Frames
    { itemId: 'style-galaxy', name: 'Galaxy Theme', description: 'Space explorer vibes', type: 'cosmetic', price: 800, payload: { cosmeticType: 'theme', value: 'galaxy' } },
  ];

  try {
    // Cleanup deprecated items
    await ShopItem.deleteOne({ itemId: 'style-neon' });

    for (const item of defaultItems) {
      await ShopItem.findOneAndUpdate(
        { itemId: item.itemId },
        { ...item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    // Migration: ensure types are correct for old data if any
    await ShopItem.updateMany({ type: 'powerup' }, { type: 'power-up' });
  } catch (err) {
    console.error('Shop Seeding Error:', err);
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

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if already owned (for cosmetics)
    if (item.type === 'cosmetic' && user.unlockedItems?.includes(itemId)) {
        return res.status(400).json({ message: 'Item already owned' });
    }

    const coins = user.coins || 0;
    if (coins < item.price) {
      return res.status(400).json({ message: 'Not enough coins' });
    }

    // Deduct coins
    user.coins = coins - item.price;
    
    // Handle Item Type
    if (item.type === 'cosmetic') {
        if (!user.unlockedItems) user.unlockedItems = [];
        user.unlockedItems.push(itemId);
    } else {
        // Consumables (power-ups / boosts)
        const inv = user.inventory || [];
        const existing = inv.find((i) => i.itemId === itemId);
        if (existing) {
            existing.quantity += 1;
        } else {
            inv.push({ itemId, quantity: 1 });
        }
        user.inventory = inv;

        // Sync with specific tracking arrays if needed (e.g. powerUps)
        // Note: The previous logic synced to 'powerUps' array too. We should maintain that for compatibility.
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
    }

    await user.save();

    res.json({ 
        message: 'Purchased successfully', 
        coins: user.coins, 
        inventory: user.inventory,
        powerUps: user.powerUps,
        unlockedItems: user.unlockedItems 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error purchasing item', error: error.message });
  }
};
