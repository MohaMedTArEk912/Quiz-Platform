export const DEFAULT_AVATAR_CONFIG = {
    skinColor: '#F5D0C5',
    hairStyle: 'short',
    hairColor: '#4A3728',
    accessory: 'none',
    backgroundColor: 'bg-indigo-100',
    mood: 'happy',
    gender: 'male',
    clothing: 'shirt',
    frame: 'none'
} as const;

export const AVATAR_OPTIONS = {
    base: {
        skinColor: ['#F5D0C5', '#E8B4A5', '#D49D8B', '#C68642', '#8D5524', '#5A3921', '#3C2E28'],
        backgroundColor: [
            'bg-indigo-100', 'bg-blue-100', 'bg-purple-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-pink-100', 'bg-gray-100', 'bg-slate-800',
            'bg-galaxy', 'bg-neon', 'bg-slate-900', 'bg-emerald-900', 'bg-orange-100'
        ],
        gender: ['male', 'female']
    },
    hair: {
        styles: [
            'short', 'messy', 'buzz', 'mohawk',
            'fade', 'quiff', 'spiky', 'afro',
            'long', 'ponytail', 'curly', 'bob', 'wavy', 'bun', 'braids', 'pixie'
        ],
        colors: [
            '#4A3728', '#2C1A0F', '#E6BE8A', '#A52A2A', '#D49D8B', '#000000', 
            '#F59E0B', '#6366F1', '#EC4899', '#FFFFFF', '#9CA3AF', '#8B4513',
            '#FFD700', '#FF1493', '#00CED1', '#9370DB', '#FF6347', '#32CD32'
        ]
    },
    clothing: {
        types: ['shirt', 'tshirt', 'hoodie', 'blazer', 'dress', 'jacket', 'sweater', 'tank']
    },
    style: {
        accessories: [
            'none', 'glasses', 'sunglasses', 'headphones', 'cap', 'mask',
            'crown', 'wizard_hat', 'pirate', 'ninja', 'viking', 'astro', 'cat_ears', 'bowtie',
            'earrings', 'necklace', 'beret'
        ]
    },
    mood: {
        moods: ['happy', 'neutral', 'cool', 'excited']
    }
} as const;
