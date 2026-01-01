import type { ShopItem } from '../types';

export const staticItems: ShopItem[] = [
    { itemId: '50-50', name: '50/50', description: 'Removes two wrong answers', type: 'power-up', price: 50, payload: { powerUpType: '5050', uses: 1 } },
    { itemId: 'time-freeze', name: 'Time Freeze', description: 'Freezes the timer for 20 seconds', type: 'power-up', price: 100, payload: { powerUpType: 'time_freeze', uses: 1 } },
    { itemId: 'skip-question', name: 'Skip Question', description: 'Skip the current question without penalty', type: 'power-up', price: 150, payload: { powerUpType: 'skip', uses: 1 } },
    { itemId: 'smart-hint', name: 'Smart Hint', description: 'Shows a hint for the current question', type: 'power-up', price: 75, payload: { powerUpType: 'hint', uses: 1 } },
    { itemId: 'streak-shield', name: 'Streak Shield', description: 'Protects your streak from one wrong answer', type: 'power-up', price: 200, payload: { powerUpType: 'shield', uses: 1 } },

    // Block & Compiler Question Power-Ups
    { itemId: 'block-hint', name: 'Block Hint', description: 'Highlights the correct block category to use', type: 'power-up', price: 100, payload: { powerUpType: 'block_hint', uses: 1 } },
    { itemId: 'code-snippet', name: 'Code Snippet', description: 'Shows example code structure for block/compiler questions', type: 'power-up', price: 125, payload: { powerUpType: 'code_snippet', uses: 1 } },
    { itemId: 'auto-complete', name: 'Auto-Complete', description: 'Fills in 50% of the solution for block/compiler questions', type: 'power-up', price: 250, payload: { powerUpType: 'auto_complete', uses: 1 } },
    { itemId: 'debug-helper', name: 'Debug Helper', description: 'Shows common mistakes to avoid', type: 'power-up', price: 90, payload: { powerUpType: 'debug_helper', uses: 1 } },
    { itemId: 'cool-glasses', name: 'Cool Glasses', description: 'A stylish pair of sunglasses for your avatar', type: 'cosmetic', price: 500, payload: { attribute: 'accessory', value: 'sunglasses' } },
    { itemId: 'golden-crown', name: 'Golden Crown', description: 'A crown fit for a quiz king or queen', type: 'cosmetic', price: 1000, payload: { attribute: 'hat', value: 'crown' } },
    { itemId: 'wizard-hat', name: 'Wizard Hat', description: 'Magical headgear', type: 'cosmetic', price: 750, payload: { attribute: 'hat', value: 'wizard_hat' } },
    { itemId: 'galaxy-theme', name: 'Galaxy Theme', description: 'Unlock the cosmic galaxy background theme', type: 'cosmetic', price: 2000, payload: { attribute: 'theme', value: 'galaxy' } },
    { itemId: 'neon-rave', name: 'Neon Rave', description: 'Electrifying neon colors for your profile', type: 'cosmetic', price: 1500, payload: { attribute: 'theme', value: 'neon' } },
    { itemId: 'cyber-frame', name: 'Cyberpunk Frame', description: 'A futuristic glitch-art frame', type: 'cosmetic', price: 1200, payload: { attribute: 'frame', value: 'cyberpunk' } },

    // Themes
    { itemId: 'midnight-theme', name: 'Midnight Theme', description: 'Deep dark blue theme for night owls', type: 'cosmetic', price: 1000, payload: { attribute: 'theme', value: 'midnight' } },
    { itemId: 'forest-theme', name: 'Forest Theme', description: 'Calming nature vibes', type: 'cosmetic', price: 1000, payload: { attribute: 'theme', value: 'forest' } },
    { itemId: 'sunset-theme', name: 'Sunset Theme', description: 'Warm gradients of a summer sunset', type: 'cosmetic', price: 1200, payload: { attribute: 'theme', value: 'sunset' } },

    // Frames
    { itemId: 'gold-frame', name: 'Gold Frame', description: 'Shiny golden border for your avatar', type: 'cosmetic', price: 2500, payload: { attribute: 'frame', value: 'gold' } },
    { itemId: 'diamond-frame', name: 'Diamond Frame', description: 'Sparkling diamond border', type: 'cosmetic', price: 5000, payload: { attribute: 'frame', value: 'diamond' } },

    // Hats / Heads
    { itemId: 'pirate-hat', name: 'Pirate Hat', description: 'Yarrr! Sail the seven seas.', type: 'cosmetic', price: 800, payload: { attribute: 'hat', value: 'pirate' } },
    { itemId: 'ninja-band', name: 'Ninja Headband', description: 'Silent but deadly knowledge.', type: 'cosmetic', price: 600, payload: { attribute: 'hat', value: 'ninja' } },
    { itemId: 'viking-helm', name: 'Viking Helmet', description: 'For the brave warriors.', type: 'cosmetic', price: 900, payload: { attribute: 'hat', value: 'viking' } },
    { itemId: 'astro-helm', name: 'Astro Helmet', description: 'Take your knowledge to the moon.', type: 'cosmetic', price: 1500, payload: { attribute: 'hat', value: 'astro' } },

    // Accessories
    { itemId: 'cat-ears', name: 'Cat Ears', description: 'Cute feline ears.', type: 'cosmetic', price: 700, payload: { attribute: 'accessory', value: 'cat_ears' } },
    { itemId: 'bowtie', name: 'Fancy Bowtie', description: 'Classy look for smart people.', type: 'cosmetic', price: 400, payload: { attribute: 'accessory', value: 'bowtie' } },
    { itemId: 'gaming-headset', name: 'Gaming Headset', description: 'Immersive audio for deep focus.', type: 'cosmetic', price: 1200, payload: { attribute: 'accessory', value: 'headphones' } },

    { itemId: 'diamond-earrings', name: 'Diamond Earrings', description: 'Sparkle like a star.', type: 'cosmetic', price: 2500, payload: { attribute: 'accessory', value: 'earrings' } },
    { itemId: 'gold-necklace', name: 'Gold Necklace', description: 'A symbol of wealth.', type: 'cosmetic', price: 3000, payload: { attribute: 'accessory', value: 'necklace' } },
    { itemId: 'artist-beret', name: 'Artist Beret', description: 'For the creative soul.', type: 'cosmetic', price: 900, payload: { attribute: 'accessory', value: 'beret' } },

    // Clothing
    { itemId: 'street-hoodie', name: 'Street Hoodie', description: 'Comfortable and stylish urban wear.', type: 'cosmetic', price: 1500, payload: { attribute: 'clothing', value: 'hoodie' } },
    { itemId: 'formal-blazer', name: 'Formal Blazer', description: 'Dress to impress.', type: 'cosmetic', price: 2000, payload: { attribute: 'clothing', value: 'blazer' } },
    { itemId: 'summer-dress', name: 'Summer Dress', description: 'Light and breezy.', type: 'cosmetic', price: 1200, payload: { attribute: 'clothing', value: 'dress' } },

    // Boosts
    { itemId: 'double-xp-1h', name: 'Double XP (1h)', description: 'Earn 2x XP for 1 hour', type: 'boost', price: 300, payload: { boost: 'xp', multiplier: 2, duration: 3600 } },
    { itemId: 'coin-magnet-1h', name: 'Coin Magnet (1h)', description: 'Earn 1.5x Coins for 1 hour', type: 'boost', price: 300, payload: { boost: 'coins', multiplier: 1.5, duration: 3600 } }
];
