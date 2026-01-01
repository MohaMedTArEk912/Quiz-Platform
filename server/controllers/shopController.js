import { ShopItem } from '../models/ShopItem.js';
import { User } from '../models/User.js';

// Defines the source of truth for Shop Items in code (matching Frontend)
const SHOP_CATALOG = [
    { itemId: '50-50', name: '50/50', description: 'Removes two wrong answers', type: 'power-up', price: 50, payload: { powerUpType: '5050', uses: 1 } },
    { itemId: 'time-freeze', name: 'Time Freeze', description: 'Freezes the timer for 10 seconds', type: 'power-up', price: 100, payload: { powerUpType: 'time_freeze', uses: 1 } },
    { itemId: 'skip-question', name: 'Skip Question', description: 'Skip the current question without penalty', type: 'power-up', price: 150, payload: { powerUpType: 'skip', uses: 1 } },
    { itemId: 'smart-hint', name: 'Smart Hint', description: 'Shows a hint for the current question', type: 'power-up', price: 75, payload: { powerUpType: 'hint', uses: 1 } },
    { itemId: 'streak-shield', name: 'Streak Shield', description: 'Protects your streak from one wrong answer', type: 'power-up', price: 200, payload: { powerUpType: 'shield', uses: 1 } },
    { itemId: 'cool-glasses', name: 'Cool Glasses', description: 'A stylish pair of sunglasses for your avatar', type: 'cosmetic', price: 500, payload: { attribute: 'accessory', value: 'sunglasses' } },
    { itemId: 'golden-crown', name: 'Golden Crown', description: 'A crown fit for a quiz king or queen', type: 'cosmetic', price: 1000, payload: { attribute: 'hat', value: 'crown' } },
    { itemId: 'wizard-hat', name: 'Wizard Hat', description: 'Magical headgear', type: 'cosmetic', price: 750, payload: { attribute: 'hat', value: 'wizard_hat' } },
    { itemId: 'galaxy-theme', name: 'Galaxy Theme', description: 'Unlock the cosmic galaxy background theme', type: 'cosmetic', price: 2000, payload: { attribute: 'theme', value: 'galaxy' } },
    { itemId: 'neon-rave', name: 'Neon Rave', description: 'Electrifying neon colors for your profile', type: 'cosmetic', price: 1500, payload: { attribute: 'theme', value: 'neon' } },
    { itemId: 'cyber-frame', name: 'Cyberpunk Frame', description: 'A futuristic glitch-art frame', type: 'cosmetic', price: 1200, payload: { attribute: 'frame', value: 'cyberpunk' } },
    { itemId: 'midnight-theme', name: 'Midnight Theme', description: 'Deep dark blue theme for night owls', type: 'cosmetic', price: 1000, payload: { attribute: 'theme', value: 'midnight' } },
    { itemId: 'forest-theme', name: 'Forest Theme', description: 'Calming nature vibes', type: 'cosmetic', price: 1000, payload: { attribute: 'theme', value: 'forest' } },
    { itemId: 'sunset-theme', name: 'Sunset Theme', description: 'Warm gradients of a summer sunset', type: 'cosmetic', price: 1200, payload: { attribute: 'theme', value: 'sunset' } },
    { itemId: 'gold-frame', name: 'Gold Frame', description: 'Shiny golden border for your avatar', type: 'cosmetic', price: 2500, payload: { attribute: 'frame', value: 'gold' } },
    { itemId: 'diamond-frame', name: 'Diamond Frame', description: 'Sparkling diamond border', type: 'cosmetic', price: 5000, payload: { attribute: 'frame', value: 'diamond' } },
    { itemId: 'pirate-hat', name: 'Pirate Hat', description: 'Yarrr! Sail the seven seas.', type: 'cosmetic', price: 800, payload: { attribute: 'hat', value: 'pirate' } },
    { itemId: 'ninja-band', name: 'Ninja Headband', description: 'Silent but deadly knowledge.', type: 'cosmetic', price: 600, payload: { attribute: 'hat', value: 'ninja' } },
    { itemId: 'viking-helm', name: 'Viking Helmet', description: 'For the brave warriors.', type: 'cosmetic', price: 900, payload: { attribute: 'hat', value: 'viking' } },
    { itemId: 'astro-helm', name: 'Astro Helmet', description: 'Take your knowledge to the moon.', type: 'cosmetic', price: 1500, payload: { attribute: 'hat', value: 'astro' } },
    { itemId: 'cat-ears', name: 'Cat Ears', description: 'Cute feline ears.', type: 'cosmetic', price: 700, payload: { attribute: 'accessory', value: 'cat_ears' } },
    { itemId: 'bowtie', name: 'Fancy Bowtie', description: 'Classy look for smart people.', type: 'cosmetic', price: 400, payload: { attribute: 'accessory', value: 'bowtie' } },
    { itemId: 'double-xp-1h', name: 'Double XP (1h)', description: 'Earn 2x XP for 1 hour', type: 'boost', price: 300, payload: { boost: 'xp', multiplier: 2, duration: 3600 } },
    { itemId: 'coin-magnet-1h', name: 'Coin Magnet (1h)', description: 'Earn 1.5x Coins for 1 hour', type: 'boost', price: 300, payload: { boost: 'coins', multiplier: 1.5, duration: 3600 } }
];

async function ensureShopSeed() {
  try {
    for (const item of SHOP_CATALOG) {
      await ShopItem.findOneAndUpdate(
        { itemId: item.itemId },
        { ...item },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  } catch (err) {
    console.error('Shop Seeding Error:', err);
  }
}

export const getShopItems = async (req, res) => {
  try {
    // Return static catalog directly for speed + reliability, but also seed DB in background
    ensureShopSeed(); 
    res.json(SHOP_CATALOG);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shop items', error: error.message });
  }
};

export const createShopItem = async (req, res) => {
  try {
    constData = req.body;
    // ... (Keep existing create logic if needed for custom admin items although admin panel is gone)
    const created = await ShopItem.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Error creating shop item', error: error.message });
  }
};

export const updateShopItem = async (req, res) => {
    // ... existing logic
    try {
        const { itemId } = req.params;
        const updated = await ShopItem.findOneAndUpdate({ itemId }, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(500).json({message: e.message}); }
};

export const deleteShopItem = async (req, res) => {
    // ... existing logic
     try {
        const { itemId } = req.params;
        await ShopItem.findOneAndDelete({ itemId });
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({message: e.message}); }
};

export const purchaseItem = async (req, res) => {
  try {
    const { itemId } = req.body;
    
    // Look up in CATALOG first for code-defined items
    let item = SHOP_CATALOG.find(i => i.itemId === itemId);
    
    // Fallback to DB if not in catalog (for dynamic items if allowed)
    if (!item) {
        item = await ShopItem.findOne({ itemId }).lean();
    }

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
