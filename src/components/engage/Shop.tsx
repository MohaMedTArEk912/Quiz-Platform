import React, { useState, useEffect } from 'react';
import type { UserData, ShopItem } from '../../types';
import { api } from '../../lib/api';
import { ShoppingBag, Coins, Zap, Clock, Target, CheckCircle2, AlertCircle, Sparkles, TrendingUp, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { staticItems } from '../../lib/shopItems';

interface ShopProps {
  user: UserData;
  onUserUpdate: (updates: Partial<UserData>) => void;
}

const Shop: React.FC<ShopProps> = ({ user, onUserUpdate }) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'powerups' | 'style'>('powerups');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    // Static items imported from lib
    setItems(staticItems);
    setLoading(false);
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
    if (name.includes('50/50')) return 'from-blue-500 to-cyan-500';
    if (name.includes('Time')) return 'from-orange-500 to-red-500';
    if (name.includes('Hint')) return 'from-purple-500 to-pink-500';
    if (name.includes('Skip')) return 'from-green-500 to-emerald-500';
    if (name.includes('Shield')) return 'from-yellow-500 to-orange-500';
    // Cosmetics
    if (name.includes('Crown')) return 'from-yellow-400 to-amber-600';
    if (name.includes('Glasses')) return 'from-gray-800 to-black';
    if (name.includes('Wizard')) return 'from-indigo-600 to-blue-800';
    if (name.includes('Wizard')) return 'from-indigo-600 to-blue-800';
    if (name.includes('Galaxy')) return 'from-slate-900 to-violet-900';
    if (name.includes('Neon')) return 'from-fuchsia-500 to-cyan-500';
    if (name.includes('Frame')) {
      if (name.includes('Gold')) return 'from-yellow-300 to-yellow-600';
      if (name.includes('Diamond')) return 'from-cyan-300 to-blue-600';
      return 'from-teal-400 to-blue-500';
    }
    if (name.includes('Midnight')) return 'from-slate-800 to-slate-950';
    if (name.includes('Forest')) return 'from-emerald-600 to-green-900';
    if (name.includes('Sunset')) return 'from-orange-400 to-rose-600';
    if (name.includes('Pirate')) return 'from-red-700 to-black';
    if (name.includes('Astro')) return 'from-gray-200 to-gray-500';
    if (name.includes('Headset')) return 'from-red-500 to-slate-900';
    if (name.includes('Earrings')) return 'from-cyan-400 to-blue-600';
    if (name.includes('Necklace')) return 'from-yellow-300 to-yellow-600';
    if (name.includes('Beret')) return 'from-gray-700 to-gray-900';
    if (name.includes('Hoodie')) return 'from-indigo-500 to-purple-600';
    if (name.includes('Blazer')) return 'from-slate-700 to-black';
    if (name.includes('Dress')) return 'from-pink-400 to-rose-500';
    if (name.includes('Magnet')) return 'from-yellow-400 to-orange-500';
    if (name.includes('Double')) return 'from-purple-500 to-yellow-400';
    return 'from-indigo-500 to-purple-500';
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
      setMessage(`🎉 ${itemName} purchased successfully!`);

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
          <p className="text-white text-xl font-semibold">Loading Shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Coin Balance */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold">Your Balance</p>
                <p className="text-4xl font-black text-white">{user.coins || 0} Coins</p>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl">
              <p className="text-white/80 text-xs font-semibold">Earn more by completing quizzes!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-semibold text-lg">{message}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Shop Items Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <ShoppingBag className="w-8 h-8" />
          {activeTab === 'powerups' ? 'Power-Ups Shop' : 'Style Shop'}
        </h2>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('powerups')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'powerups'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white dark:bg-white/5 text-gray-500 hover:text-indigo-500'}`}
          >
            Power-Ups
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'style'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white dark:bg-white/5 text-gray-500 hover:text-purple-500'}`}
          >
            Style Shop
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.filter(i => activeTab === 'powerups' ? (i.type === 'power-up' || i.type === 'boost') : i.type === 'cosmetic').map((item, index) => {
            const canAfford = (user.coins || 0) >= item.price;
            const isPurchasing = purchasingId === item.itemId;
            const gradient = getItemGradient(item.name);

            // Check if already owned
            const isOwned = user.unlockedItems?.includes(item.itemId);

            return (
              <div
                key={item.itemId}
                className="group relative bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl dark:shadow-none hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                {/* Shine effect */}
                <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:left-full transition-all duration-1000"></div>

                {/* Content */}
                <div className="relative z-10 p-8">
                  {/* Icon with glow */}
                  <div className="relative mb-6">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                    <div className={`relative w-24 h-24 bg-gradient-to-br ${gradient} rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 mx-auto`}>
                      {getItemIcon(item.name)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 text-center group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-pink-500 group-hover:bg-clip-text transition-all duration-300">
                    {item.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-slate-400 text-sm mb-6 text-center leading-relaxed min-h-[60px]">
                    {item.description}
                  </p>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-600 to-transparent mb-6"></div>

                  {/* Price and Button */}
                  <div className="space-y-4">
                    {/* Price Tag */}
                    <div className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-3 rounded-2xl border border-gray-200 dark:border-slate-700/50">
                      <Coins className="w-6 h-6 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{item.price}</span>
                      <span className="text-gray-500 dark:text-slate-400 text-sm">coins</span>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => purchase(item.itemId, item.name)}
                      disabled={!canAfford || isPurchasing || isOwned}
                      className={`w-full px-8 py-4 rounded-2xl font-black text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl ${canAfford && !isOwned
                        ? `bg-gradient-to-r ${gradient} hover:shadow-2xl hover:shadow-purple-500/50 text-white`
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-400'
                        }`}
                    >
                      {isPurchasing ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          Purchasing...
                        </span>
                      ) : isOwned ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          Owned
                        </span>
                      ) : canAfford ? (
                        <span className="flex items-center justify-center gap-2">
                          <ShoppingBag className="w-5 h-5" />
                          Buy Now
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Coins className="w-5 h-5" />
                          Not Enough Coins
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${gradient} opacity-20 blur-2xl`}></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Shop;
