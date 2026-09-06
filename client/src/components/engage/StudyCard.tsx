import React, { useEffect, useState } from 'react';
import type { StudyCard } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import {
  BookOpen, ChevronLeft, ChevronRight, Grid3x3, Search, LayoutGrid, Filter, Folder, ArrowLeft
} from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

const StudyCardComponent: React.FC = () => {
  const { isBento } = useTheme();
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation State
  const [activeStack, setActiveStack] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Notification State
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Helper to clear notification after delay
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (notification) {
      timeout = setTimeout(() => setNotification(null), 3000);
    }
    return () => clearTimeout(timeout);
  }, [notification]);

  // Modal States removed
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All Languages');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

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

  useEffect(() => {
    loadCards();
  }, []);



  // Derived Data
  const languages = ['All Languages', ...Array.from(new Set(cards.map(c => c.language || 'General')))];
  const categories = ['All Categories', ...Array.from(new Set(cards.map(c => c.category || 'Uncategorized')))];

  const stacks = Array.from(new Set(
    cards
      .filter(c =>
        (selectedLanguage === 'All Languages' || (c.language || 'General') === selectedLanguage) &&
        (selectedCategory === 'All Categories' || (c.category || 'Uncategorized') === selectedCategory)
      )
      .map(c => c.category || 'Uncategorized')
  ));

  const filteredCards = activeStack
    ? cards.filter(card => (card.category || 'Uncategorized') === activeStack)
    : [];

  const searchFilteredCards = activeStack
    ? (Array.isArray(filteredCards) ? filteredCards : []).filter(card => {
      if (!card) return false;
      const q = (searchQuery || '').toLowerCase();
      const title = (card.title || '').toLowerCase();
      const content = (card.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    })
    : [];

  const currentCard = searchFilteredCards[currentIndex];

  // --- Handlers ---

  const handleStackClick = (stack: string) => {
    setActiveStack(stack);
    setCurrentIndex(0);
    setSearchQuery('');
  };

  const handleBackToStacks = () => {
    setActiveStack(null);
    setSearchQuery('');
  };

  // Keyboard Navigation
  useEffect(() => {
    if (!activeStack || viewMode !== 'card') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(searchFilteredCards.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStack, viewMode, searchFilteredCards.length]);

  // --- Render ---

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex items-center justify-center text-indigo-500 font-bold">Loading...</div>;
  if (error) return <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] flex items-center justify-center text-red-500 font-bold">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-white p-6 relative overflow-x-hidden selection:bg-purple-500/30">

      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold animate-in slide-in-from-top-4 fade-in duration-300 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
          {notification.message}
        </div>
      )}

      {/* Background FX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[128px] mix-blend-screen animate-pulse delay-1000" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header Section */}
        <div className={`rounded-3xl p-8 relative overflow-hidden mb-12 transition-all ${
          isBento
            ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
            : 'bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-2xl'
        }`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              {activeStack && (
                <button
                  onClick={handleBackToStacks}
                  className={`p-3 rounded-xl transition group cursor-pointer ${
                    isBento
                      ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:translate-x-0.5'
                      : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
              )}
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${
                isBento
                  ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-lg shadow-indigo-500/20'
              }`}>
                {activeStack ? <BookOpen className="w-10 h-10" /> : <Folder className="w-10 h-10" />}
              </div>
              <div>
                <h1 className={`text-3xl md:text-4xl font-black mb-1 tracking-tight ${
                  isBento ? 'text-black uppercase' : 'text-gray-900 dark:text-white'
                }`}>
                  {activeStack || 'Cards'}
                </h1>
                <p className={`text-sm ${
                  isBento ? 'text-black/70 font-semibold' : 'text-gray-600 dark:text-gray-400 font-medium'
                }`}>
                  {activeStack ? `${searchFilteredCards.length} Cards in this stack` : `${stacks.length} Stacks available`}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              {/* Global Actions */}
              {!activeStack ? (
                /* Global Filters */
                <div className="flex gap-3 relative z-20">
                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className={`appearance-none pl-10 pr-10 py-3 rounded-xl font-black text-sm focus:outline-none cursor-pointer min-w-[160px] ${
                        isBento
                          ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                          : 'bg-[#13141f] border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50'
                      }`}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-white text-black dark:bg-[#13141f] dark:text-white">{cat}</option>
                      ))}
                    </select>
                    <Folder className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isBento ? 'text-black' : 'text-gray-400'}`} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className={`w-4 h-4 ${isBento ? 'text-black' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {/* Language Filter */}
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className={`appearance-none pl-10 pr-10 py-3 rounded-xl font-black text-sm focus:outline-none cursor-pointer min-w-[160px] ${
                        isBento
                          ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                          : 'bg-[#13141f] border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50'
                      }`}
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang} className="bg-white text-black dark:bg-[#13141f] dark:text-white">{lang}</option>
                      ))}
                    </select>
                    <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isBento ? 'text-black' : 'text-gray-400'}`} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className={`w-4 h-4 ${isBento ? 'text-black' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`flex p-1 rounded-2xl mr-4 ${
                  isBento
                    ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5'
                }`}>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      viewMode === 'card'
                        ? isBento ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]' : 'bg-indigo-600 text-white shadow-lg'
                        : isBento ? 'text-black/70 hover:bg-black/5' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      viewMode === 'list'
                        ? isBento ? 'bg-[#bef264] text-black border border-black shadow-[1px_1px_0px_#000]' : 'bg-indigo-600 text-white shadow-lg'
                        : isBento ? 'text-black/70 hover:bg-black/5' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar only when inside stack */}
          {activeStack && (
            <div className="mt-8 relative group max-w-2xl mx-auto">
              <Search className={`absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                isBento ? 'text-black' : 'text-gray-400 group-focus-within:text-indigo-500'
              }`} />
              <input
                type="text"
                placeholder="Search within this stack..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                className={`w-full pl-14 pr-6 py-4 rounded-2xl font-bold text-sm focus:outline-none transition-all ${
                  isBento
                    ? 'bg-white text-black placeholder-black/50 border-2 border-black shadow-[3px_3px_0px_#000] focus:ring-2 focus:ring-black'
                    : 'bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/50'
                }`}
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        {!activeStack ? (
          /* STACKS GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stacks.map((stack) => {
              const stackCards = cards.filter(c => (c.category || 'Uncategorized') === stack);
              const topicLanguage = stackCards[0]?.language || 'General';
              const difficulty = stackCards.length > 20 ? 'Advanced' : stackCards.length > 10 ? 'Intermediate' : 'Beginner';
              const diffColor = isBento
                ? 'bg-[#fde047] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : difficulty === 'Advanced' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                  difficulty === 'Intermediate' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' :
                    'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

              return (
                <div
                  key={stack}
                  onClick={() => handleStackClick(stack)}
                  className="group relative min-h-[420px] cursor-pointer"
                >
                  {/* Card Content */}
                  <div className={`relative h-full rounded-3xl p-8 flex flex-col overflow-hidden transition-all duration-200 ${
                    isBento
                      ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_#000]'
                      : 'bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 group-hover:-translate-y-2 shadow-xl dark:shadow-none'
                  }`}>
                    <div className="relative flex justify-between items-start mb-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 ${
                        isBento
                          ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] group-hover:scale-105'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg group-hover:scale-110'
                      }`}>
                        <Folder className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="relative flex-grow">
                      <h3 className={`text-2xl font-black mb-3 transition-colors ${
                        isBento ? 'text-black uppercase tracking-tight' : 'text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400'
                      }`}>
                        {stack}
                      </h3>
                      <p className={`text-sm leading-relaxed mb-6 line-clamp-3 ${
                        isBento ? 'text-black/70 font-medium' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        Contains {stackCards.length} flashcards on {topicLanguage}.
                        Master this topic by reviewing regularly.
                      </p>

                      <div className="flex flex-wrap gap-2 mb-8">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${diffColor}`}>
                          {difficulty}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          isBento
                            ? 'bg-[#ddd6fe] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {stackCards.length} Cards
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          isBento
                            ? 'bg-[#93c5fd] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {topicLanguage}
                        </span>
                      </div>

                      {/* Preview Dots */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex -space-x-3">
                          {stackCards.slice(0, 3).map((_, i) => (
                            <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                              isBento ? 'bg-white border-black' : 'bg-gray-100 dark:bg-white/5 border-white dark:border-[#13141f]'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isBento ? 'bg-black' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            </div>
                          ))}
                        </div>
                        {stackCards.length > 3 && <span className={`text-xs font-black ml-2 ${isBento ? 'text-black/70' : 'text-gray-400 font-bold'}`}>+{stackCards.length - 3} more</span>}
                      </div>
                    </div>

                    <button className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isBento
                        ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-blue-500/25 group-hover:scale-[1.02]'
                    }`}>
                      <BookOpen className="w-4 h-4" /> Start Studying
                    </button>
                  </div>
                </div>
              );
            })}
            {stacks.length === 0 && (
              <div className={`col-span-full py-20 text-center rounded-3xl ${
                isBento
                  ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                  : 'border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[3rem]'
              }`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  isBento ? 'bg-[#fde047] text-black border-2 border-black' : 'bg-gray-50 dark:bg-white/5 text-gray-300'
                }`}>
                  <Folder className="w-10 h-10" />
                </div>
                <h3 className={`text-xl font-black mb-2 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white font-bold'}`}>No Study Stacks Available</h3>
                <p className={`text-xs max-w-md mx-auto ${isBento ? 'text-black/70 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                  Check back soon for new study materials!
                </p>
              </div>
            )}
          </div>
        ) : (
          /* CARDS VIEW (Inside Stack) */
          searchFilteredCards.length === 0 ? (
            <div className={`text-center py-20 rounded-3xl ${
              isBento
                ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                : 'bg-white dark:bg-[#13141f] rounded-[3rem] border border-gray-200 dark:border-white/5'
            }`}>
              <p className={`text-xl font-black ${isBento ? 'text-black' : 'text-gray-500'}`}>No cards match your search.</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="flex flex-col gap-6">
              {/* Progress Bar */}
              <div className="flex items-center justify-between px-2">
                <span className={`font-black uppercase tracking-widest text-xs ${isBento ? 'text-black' : 'text-gray-500 dark:text-gray-400'}`}>
                  Card {currentIndex + 1} / {searchFilteredCards.length}
                </span>
                <div className={`flex-1 mx-6 h-3 rounded-full overflow-hidden ${
                  isBento ? 'bg-white border-2 border-black' : 'bg-gray-200 dark:bg-white/10'
                }`}>
                  <div className={`h-full transition-all duration-300 ${
                    isBento ? 'bg-[#bef264]' : 'bg-indigo-500 rounded-full'
                  }`} style={{ width: `${((currentIndex + 1) / searchFilteredCards.length) * 100}%` }} />
                </div>
              </div>

              {/* Single Card View */}
              <div className="relative min-h-[500px]">
                <div className={`relative h-full rounded-3xl p-10 md:p-14 flex flex-col justify-between transition-all ${
                  isBento
                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] rounded-[3rem] border border-gray-200 dark:border-white/5 shadow-2xl'
                }`}>
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${
                        isBento
                          ? 'bg-[#ddd6fe] text-black border-2 border-black'
                          : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {currentCard.language || 'General'}
                      </span>
                      {currentCard.tags?.map(tag => (
                        <span key={tag} className={`text-xs font-black uppercase tracking-wide ${isBento ? 'text-black/70' : 'text-gray-500'}`}>#{tag}</span>
                      ))}
                    </div>
                    <h2 className={`text-3xl md:text-5xl font-black leading-tight mb-8 ${
                      isBento ? 'text-black uppercase tracking-tight' : 'text-gray-900 dark:text-white'
                    }`}>
                      <MathRenderer text={currentCard.title} />
                    </h2>
                    <div className={`rounded-2xl p-8 relative overflow-hidden ${
                      isBento
                        ? 'bg-[#fef9c3]/50 text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-gray-50 dark:bg-[#0a0a0b] rounded-3xl border border-gray-200 dark:border-white/5'
                    }`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${isBento ? 'bg-black' : 'bg-indigo-500/50'}`}></div>
                      <MathRenderer text={currentCard.content} className={`whitespace-pre-wrap text-lg font-bold leading-relaxed ${
                        isBento ? 'text-black font-mono' : 'text-gray-700 dark:text-gray-300'
                      }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between select-none mt-8">
                    <button
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider transition cursor-pointer disabled:opacity-30 ${
                        isBento
                          ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 font-bold'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" /> PREV
                    </button>
                    <button
                      onClick={() => setCurrentIndex(prev => Math.min(searchFilteredCards.length - 1, prev + 1))}
                      disabled={currentIndex === searchFilteredCards.length - 1}
                      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-wider transition cursor-pointer disabled:opacity-30 ${
                        isBento
                          ? 'bg-[#bef264] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                          : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 font-bold'
                      }`}
                    >
                      NEXT <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {searchFilteredCards.map((card, idx) => (
                <div key={card.id} className={`rounded-3xl p-8 transition relative group ${
                  isBento
                    ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                    : 'bg-white dark:bg-[#13141f] border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 shadow-xl'
                }`}>
                  <h3 className={`text-xl font-black mb-2 ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{card.title}</h3>
                  <p className={`line-clamp-2 text-sm mb-4 ${isBento ? 'text-black/70 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{card.content}</p>
                  <button onClick={() => { setCurrentIndex(idx); setViewMode('card'); }} className={`font-black text-xs uppercase tracking-wider underline cursor-pointer ${
                    isBento ? 'text-black' : 'text-indigo-500 hover:underline'
                  }`}>View Card</button>
                </div>
              ))}
            </div>
          )
        )}
      </div >



    </div >
  );
};

export default StudyCardComponent;
