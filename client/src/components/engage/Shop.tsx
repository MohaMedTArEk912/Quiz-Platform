import React, { useState, useEffect } from 'react';
import type { UserData, ShopItem } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { ShoppingBag, Coins, Zap, Clock, Target, CheckCircle2, AlertCircle, Sparkles, TrendingUp, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SHOP_ITEM_GRADIENTS, DEFAULT_SHOP_LOADING_MESSAGE, PURCHASE_SUCCESS_MESSAGE } from '../../constants/shopDefaults';

interface ShopProps {
  user: UserData;
  onUserUpdate: (updates: Partial<UserData>) => void;
}

const Shop: React.FC<ShopProps> = ({ user, onUserUpdate }) => {
  const { isBento } = useTheme();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'powerups' | 'style'>('powerups');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const shopItems = await api.getShopItems();
        setItems(shopItems);
      } catch (err) {
        setError("Failed to load shop items. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, []);

  const getItemIcon = (name: string) => {
    const iconClass = "w-10 h-10 text-white";
    if (name.includes('50/50')) return <Target className={iconClass} />;
    if (name.includes('Time')) return <Clock className={iconClass} />;
    if (name.includes('Hint')) return <Sparkles className={iconClass} />;
    if (name.includes('Skip')) return <TrendingUp className={iconClass} />;
    if (name.includes('Shield')) return <Shield className={iconClass} />;

    // Cosmetics
    if (name.includes('Glasses') || name.includes('Sunglasses')) return <div className="text-3xl">🕶️</div>;
    if (name.includes('Crown')) return <div className="text-3xl">👑</div>;
    if (name.includes('Wizard')) return <div className="text-3xl">🧙‍♂️</div>;
    if (name.includes('Wizard')) return <div className="text-3xl">🧙‍♂️</div>;
    if (name.includes('Galaxy')) return <div className="text-3xl">🌌</div>;
    if (name.includes('Neon')) return <div className="text-3xl">🎆</div>;
    if (name.includes('Frame')) {
      if (name.includes('Gold')) return <div className="text-3xl">⚜️</div>;
      if (name.includes('Diamond')) return <div className="text-3xl">💎</div>;
      return <div className="text-3xl">🖼️</div>;
    }
    if (name.includes('Theme')) {
      if (name.includes('Midnight')) return <div className="text-3xl">🌙</div>;
      if (name.includes('Forest')) return <div className="text-3xl">🌲</div>;
      if (name.includes('Sunset')) return <div className="text-3xl">🌅</div>;
    }
    if (name.includes('Pirate')) return <div className="text-3xl">🏴‍☠️</div>;
    if (name.includes('Ninja')) return <div className="text-3xl">🥷</div>;
    if (name.includes('Viking')) return <div className="text-3xl">🛡️</div>;
    if (name.includes('Astro')) return <div className="text-3xl">👨‍🚀</div>;
    if (name.includes('Cat')) return <div className="text-3xl">🐱</div>;
    if (name.includes('Bowtie')) return <div className="text-3xl">🤵</div>;
    if (name.includes('Headset')) return <div className="text-3xl">🎧</div>;
    if (name.includes('Earrings')) return <div className="text-3xl">💎</div>;
    if (name.includes('Necklace')) return <div className="text-3xl">📿</div>;
    if (name.includes('Beret')) return <div className="text-3xl">🎨</div>;
    if (name.includes('Hoodie')) return <div className="text-3xl">🧥</div>;
    if (name.includes('Blazer')) return <div className="text-3xl">👔</div>;
    if (name.includes('Dress')) return <div className="text-3xl">👗</div>;

    // Boosts
    if (name.includes('Double XP')) return <Zap className={iconClass} fill="yellow" />;
    if (name.includes('Magnet')) return <div className="text-3xl">🧲</div>;

    return <Zap className={iconClass} />;
  };

  const getItemGradient = (name: string) => {
    for (const key in SHOP_ITEM_GRADIENTS) {
      if (name.includes(key)) return SHOP_ITEM_GRADIENTS[key];
    }
    return SHOP_ITEM_GRADIENTS.default;
  };

  const purchase = async (itemId: string, itemName: string) => {
    try {
      setPurchasingId(itemId);
      setMessage(null);
      setError(null);

      const res = await api.purchaseItem(itemId, user.userId);

      // Update both inventory and powerUps to ensure compatibility
      // inventory is the raw purchase data, powerUps is what the quiz uses
      onUserUpdate({
        coins: res.coins,
        inventory: res.inventory,
        powerUps: res.powerUps,
        unlockedItems: res.unlockedItems
      });

      // Success message
      setMessage(PURCHASE_SUCCESS_MESSAGE(itemName));

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF69B4', '#9370DB']
      });

      // Auto-dismiss message
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">{DEFAULT_SHOP_LOADING_MESSAGE}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header with Coin Balance */}
      <div className="mb-8">
        <div className={`rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-all ${
          isBento
            ? 'bg-[#fde047] text-black border-3 border-black shadow-[6px_6px_0px_#000]'
            : 'glass-panel border border-slate-200/80 dark:border-white/10 shadow-sm'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isBento
                  ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10'
              }`}>
                <Coins className={`w-7 h-7 ${isBento ? 'text-black' : 'text-amber-500'}`} />
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider mb-0.5 ${
                  isBento ? 'text-black/80 font-black' : 'text-slate-500 dark:text-slate-400 font-semibold'
                }`}>Your Treasury</p>
                <div className="flex items-baseline gap-2">
                  <span className={`font-tabular text-3xl sm:text-4xl font-black ${
                    isBento ? 'text-black' : 'text-slate-900 dark:text-white'
                  }`}>{(user.coins || 0).toLocaleString()}</span>
                  <span className={`text-xs uppercase tracking-wider font-black ${
                    isBento ? 'text-black/70' : 'text-amber-500 font-bold'
                  }`}>Coins</span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xs font-black ${
              isBento
                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'glass-card border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold'
            }`}>
              ✨ Earn rewards by completing daily quizzes & skill modules
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-6 px-5 py-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-black ${
          isBento
            ? 'bg-[#bbf7d0] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className={`mb-6 px-5 py-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-black ${
          isBento
            ? 'bg-[#fecdd3] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shop Items Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
            isBento ? 'text-black uppercase' : 'text-slate-900 dark:text-white font-extrabold'
          }`}>
            <ShoppingBag className={`w-6 h-6 ${isBento ? 'text-black' : 'text-indigo-500'}`} />
            {activeTab === 'powerups' ? 'Power-Ups & Boosters' : 'Style & Cosmetics'}
          </h2>

          {/* Segmented Tabs */}
          <div className={`p-1.5 rounded-2xl flex gap-1.5 self-start sm:self-auto transition-all ${
            isBento
              ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]'
              : 'glass-panel shadow-sm'
          }`}>
            <button
              onClick={() => setActiveTab('powerups')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'powerups'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Power-Ups
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'style'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Style Shop
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.filter(i => activeTab === 'powerups' ? (i.type === 'power-up' || i.type === 'boost') : i.type === 'cosmetic').map((item) => {
            const canAfford = (user.coins || 0) >= item.price;
            const isPurchasing = purchasingId === item.itemId;
            const gradient = getItemGradient(item.name);
            const isOwned = user.unlockedItems?.includes(item.itemId);

            return (
              <div
                key={item.itemId}
                className={`group relative rounded-3xl transition-all duration-200 overflow-hidden flex flex-col p-6 ${
                  isBento
                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#000]'
                    : 'glass-card border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/40 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Content */}
                <div className="relative z-10 flex flex-col flex-1">
                  {/* Icon */}
                  <div className="mb-4 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-300 ${
                      isBento
                        ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                        : `bg-gradient-to-br ${gradient} shadow-md`
                    }`}>
                      {getItemIcon(item.name)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-lg font-black mb-1.5 text-center ${
                    isBento ? 'text-black uppercase tracking-tight' : 'text-slate-900 dark:text-white'
                  }`}>
                    {item.name}
                  </h3>

                  {/* Description */}
                  <p className={`text-xs mb-6 text-center leading-relaxed flex-1 ${
                    isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.description}
                  </p>

                  {/* Price and Button */}
                  <div className={`space-y-3 pt-4 ${
                    isBento ? 'border-t-2 border-black' : 'border-t border-slate-200/60 dark:border-white/[0.06]'
                  }`}>
                    {/* Price Tag */}
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl ${
                      isBento
                        ? 'bg-[#fef9c3] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                        : 'bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]'
                    }`}>
                      <Coins className={`w-4 h-4 ${isBento ? 'text-black' : 'text-amber-500'}`} />
                      <span className={`font-tabular text-xl font-black ${
                        isBento ? 'text-black' : 'text-slate-900 dark:text-white font-extrabold'
                      }`}>{item.price?.toLocaleString() || 0}</span>
                      <span className={`text-xs font-black uppercase ${isBento ? 'text-black/70' : 'text-slate-400'}`}>coins</span>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => purchase(item.itemId, item.name)}
                      disabled={!canAfford || isPurchasing || isOwned}
                      className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                        isBento
                          ? isOwned
                            ? 'bg-[#e2e8f0] text-black border-2 border-black shadow-[2px_2px_0px_#000] cursor-default'
                            : canAfford
                              ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#000]'
                              : 'bg-slate-200 text-black/50 border-2 border-black/30'
                          : isOwned
                            ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                            : canAfford
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isPurchasing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </span>
                      ) : isOwned ? (
                        <span className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                          <CheckCircle2 className="w-4 h-4" />
                          Owned
                        </span>
                      ) : canAfford ? (
                        <span className="flex items-center justify-center gap-1.5 font-black">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Purchase
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5 font-black">
                          <Coins className="w-3.5 h-3.5" />
                          Insufficient Coins
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Shop;
