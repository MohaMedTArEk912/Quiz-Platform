import React, { useEffect, useState } from 'react';
import type { StudyCard } from '../../types';
import { api } from '../../lib/api';
import { BookOpen, ChevronLeft, ChevronRight, Grid3x3, Search, Tag, Calendar, BrainCircuit, GraduationCap, LayoutGrid } from 'lucide-react';

const StudyMode: React.FC = () => {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        const data = await api.getStudyCards();
        setCards(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadCards();
  }, []);

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
    const matchesLanguage = selectedLanguage === 'all' || (card.language || 'General') === selectedLanguage;
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  const categories = ['all', ...Array.from(new Set(cards.map(c => c.category)))];
  // Dynamic languages from cards, defaults to 'General' if not specified to avoid "undefined" filter
  const languages = ['all', ...Array.from(new Set(cards.map(c => c.language || 'General')))];

  const currentCard = filteredCards[currentIndex];

  const nextCard = () => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center max-w-md backdrop-blur-xl">
          <p className="text-xl font-bold text-red-400 mb-2">System Error</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 relative overflow-x-hidden selection:bg-purple-500/30">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 relative z-10">
        <div className="bg-[#13141f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Top Shine */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
                  Study Mode
                </h1>
                <p className="text-gray-400 font-medium">Master your subjects with curated materials</p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5">
              <button
                onClick={() => setViewMode('card')}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'card'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Wait, Cards
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <LayoutGrid className="w-4 h-4" />
                List View
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-10 flex flex-col gap-6 relative z-10">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search topics, keywords..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentIndex(0);
                }}
                className="w-full pl-14 pr-6 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none flex-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentIndex(0);
                    }}
                    className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${selectedCategory === category
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                      : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {category === 'all' ? 'All Topics' : category}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none border-l border-white/10 pl-6">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Language:</span>
                {languages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setCurrentIndex(0);
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all border ${selectedLanguage === lang
                      ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                      : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {lang === 'all' ? 'All' : lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto relative z-10">
        {filteredCards.length === 0 ? (
          <div className="bg-[#13141f] rounded-[2.5rem] p-16 border border-white/5 text-center border-dashed">
            <BrainCircuit className="w-24 h-24 text-gray-800 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-gray-500 mb-2">No Materials Found</h3>
            <p className="text-gray-600 text-lg">
              {selectedLanguage !== 'all'
                ? `No cards found for ${selectedLanguage} in this category.`
                : "Try adjusting your search criteria."}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          /* Card View */
          <div className="flex flex-col gap-6">
            {/* Progress */}
            <div className="flex items-center justify-between px-2">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                Card {currentIndex + 1} / {filteredCards.length}
              </span>
              <div className="flex-1 mx-6 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Flashcard */}
            <div className="group relative min-h-[500px] perspective-1000">
              {/* Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>

              <div className="relative h-full bg-[#13141f] rounded-[3rem] border border-white/5 p-10 md:p-14 flex flex-col justify-between shadow-2xl">
                {/* Top Shine */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest">
                          {currentCard.category}
                        </span>
                        {currentCard.tags?.map(tag => (
                          <span key={tag} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-2">
                        {currentCard.title}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                        <Calendar className="w-4 h-4" />
                        Added {new Date(currentCard.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>

                  <div className="bg-[#0a0a0b] rounded-3xl p-8 border border-white/5 mb-8 relative overflow-hidden group/content">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                    <div className="prose prose-invert max-w-none">
                      <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg font-medium">
                        {currentCard.content}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between select-none">
                  <button
                    onClick={prevCard}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed group/btn"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                    PREV
                  </button>

                  <div className="flex gap-1.5">
                    {filteredCards.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/10 hover:bg-white/30'
                          }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextCard}
                    disabled={currentIndex === filteredCards.length - 1}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-30 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed group/btn"
                  >
                    NEXT
                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCards.map((card, idx) => (
              <div
                key={card.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setViewMode('card');
                }}
                className="group relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                <div className="relative bg-[#13141f] rounded-3xl p-8 border border-white/5 hover:border-indigo-500/30 transition-colors shadow-xl group-hover:-translate-y-1 transform duration-300 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                      {card.category}
                    </span>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-auto">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-3 leading-tight group-hover:text-indigo-400 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-gray-400 line-clamp-3 mb-6 text-sm leading-relaxed flex-grow">
                    {card.content}
                  </p>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <Tag className="w-4 h-4 text-gray-600" />
                    <div className="flex gap-2">
                      {card.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs font-semibold text-gray-500">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMode;
