export const SHOP_ITEM_GRADIENTS: Record<string, string> = {
    '50/50': 'from-blue-500 to-cyan-500',
    'Time': 'from-orange-500 to-red-500',
    'Hint': 'from-purple-500 to-pink-500',
    'Skip': 'from-green-500 to-emerald-500',
    'Shield': 'from-yellow-500 to-orange-500',
    'Crown': 'from-yellow-400 to-amber-600',
    'Glasses': 'from-gray-800 to-black',
    'Wizard': 'from-indigo-600 to-blue-800',
    'Galaxy': 'from-slate-900 to-violet-900',
    'Neon': 'from-fuchsia-500 to-cyan-500',
    'Frame Gold': 'from-yellow-300 to-yellow-600',
    'Frame Diamond': 'from-cyan-300 to-blue-600',
    'Frame': 'from-teal-400 to-blue-500',
    'Midnight': 'from-slate-800 to-slate-950',
    'Forest': 'from-emerald-600 to-green-900',
    'Sunset': 'from-orange-400 to-rose-600',
    'Pirate': 'from-red-700 to-black',
    'Astro': 'from-gray-200 to-gray-500',
    'Headset': 'from-red-500 to-slate-900',
    'Earrings': 'from-cyan-400 to-blue-600',
    'Necklace': 'from-yellow-300 to-yellow-600',
    'Beret': 'from-gray-700 to-gray-900',
    'Hoodie': 'from-indigo-500 to-purple-600',
    'Blazer': 'from-slate-700 to-black',
    'Dress': 'from-pink-400 to-rose-500',
    'Magnet': 'from-yellow-400 to-orange-500',
    'Double': 'from-purple-500 to-yellow-400',
    'default': 'from-indigo-500 to-purple-500'
};

export const DEFAULT_SHOP_LOADING_MESSAGE = "Loading Shop...";
export const PURCHASE_SUCCESS_MESSAGE = (itemName: string) => `🎉 ${itemName} purchased successfully!`;
