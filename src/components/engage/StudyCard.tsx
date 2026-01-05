import React, { useEffect, useState } from 'react';
import type { StudyCard } from '../../types';
import { api } from '../../lib/api';
import {
  BookOpen, ChevronLeft, ChevronRight, Grid3x3, Search, LayoutGrid, Filter, Folder, ArrowLeft
} from 'lucide-react';

const StudyCardComponent: React.FC = () => {
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
    ? filteredCards.filter(card =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
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
        <div className="bg-white dark:bg-[#13141f] rounded-[2.5rem] p-8 border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              {activeStack && (
                <button
                  onClick={handleBackToStacks}
                  className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition group"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:-translate-x-1 transition-transform" />
                </button>
              )}
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {activeStack ? <BookOpen className="w-10 h-10 text-white" /> : <Folder className="w-10 h-10 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
                  {activeStack || 'Cards'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
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
                      className="appearance-none pl-10 pr-10 py-3 bg-[#13141f] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer min-w-[160px]"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {/* Language Filter */}
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="appearance-none pl-10 pr-10 py-3 bg-[#13141f] border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer min-w-[160px]"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex p-1 bg-gray-100 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5 mr-4">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'card' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar only when inside stack? Or global? Keep it global style but filtered logic */}
          {activeStack && (
            <div className="mt-8 relative group max-w-2xl mx-auto">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search within this stack..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
                className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        {!activeStack ? (
          /* STACKS GRID VIEW (Matching QuizList Style) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stacks.map((stack) => {
              const stackCards = cards.filter(c => (c.category || 'Uncategorized') === stack);
              const topicLanguage = stackCards[0]?.language || 'General';
              // Simulated metadata for visual parity with QuizList
              const difficulty = stackCards.length > 20 ? 'Advanced' : stackCards.length > 10 ? 'Intermediate' : 'Beginner';
              const diffColor = difficulty === 'Advanced' ? 'border-red-500/20 bg-red-500/10 text-red-400' :
                difficulty === 'Intermediate' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' :
                  'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';

              return (
                <div
                  key={stack}
                  onClick={() => handleStackClick(stack)}
                  className="group relative min-h-[420px] cursor-pointer perspective-1000"
                >
                  {/* Hover Glow */}
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-[2.5rem] opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />

                  {/* Card Content */}
                  <div className="relative h-full bg-white dark:bg-[#13141f] rounded-[2.5rem] border border-gray-200 dark:border-white/5 p-8 flex flex-col overflow-hidden group-hover:-translate-y-2 transition-transform duration-300 shadow-xl dark:shadow-none">
                    {/* Top Shine */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-50 dark:from-white/5 to-transparent pointer-events-none" />

                    <div className="relative flex justify-between items-start mb-6">
                      {/* Simulated Icon based on content */}
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                        <Folder className="w-8 h-8 text-white" />
                      </div>


                    </div>

                    <div className="relative flex-grow">
                      <h3 className="text-2xl font-black mb-3 text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {stack}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">
                        Contains {stackCards.length} flashcards on {topicLanguage}.
                        Master this topic by reviewing regularly.
                      </p>

                      <div className="flex flex-wrap gap-2 mb-8">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${diffColor}`}>
                          {difficulty}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {stackCards.length} Cards
                        </span>
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {topicLanguage}
                        </span>
                      </div>

                      {/* Preview Dots */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex -space-x-3">
                          {stackCards.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 border-2 border-white dark:border-[#13141f] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                            </div>
                          ))}
                        </div>
                        {stackCards.length > 3 && <span className="text-xs text-gray-400 font-bold ml-2">+{stackCards.length - 3} more</span>}
                      </div>
                    </div>

                    <button className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-blue-500/25 group-hover:scale-[1.02] transform">
                      <BookOpen className="w-4 h-4" /> Start Studying
                    </button>
                  </div>
                </div>
              );
            })}
            {stacks.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[3rem]">
                <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Study Stacks Available</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Check back soon for new study materials!
                </p>
              </div>
            )}
          </div>
        ) : (
          /* CARDS VIEW (Inside Stack) */
          searchFilteredCards.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#13141f] rounded-[3rem] border border-gray-200 dark:border-white/5">
              <p className="text-xl font-bold text-gray-500">No cards match your search.</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="flex flex-col gap-6">
              {/* Progress Bar */}
              <div className="flex items-center justify-between px-2">
                <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">
                  Card {currentIndex + 1} / {searchFilteredCards.length}
                </span>
                <div className="flex-1 mx-6 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / searchFilteredCards.length) * 100}%` }} />
                </div>
              </div>

              {/* Single Card View */}
              <div className="group relative min-h-[500px] perspective-1000">
                <div className="relative h-full bg-white dark:bg-[#13141f] rounded-[3rem] border border-gray-200 dark:border-white/5 p-10 md:p-14 flex flex-col justify-between shadow-2xl">


                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
                        {currentCard.language || 'General'}
                      </span>
                      {currentCard.tags?.map(tag => (
                        <span key={tag} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">#{tag}</span>
                      ))}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-8">
                      {currentCard.title}
                    </h2>
                    <div className="bg-gray-50 dark:bg-[#0a0a0b] rounded-3xl p-8 border border-gray-200 dark:border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg font-medium leading-relaxed">
                        {currentCard.content}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between select-none mt-8">
                    <button
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-white/5 rounded-xl font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-white/10 transition"
                    >
                      <ChevronLeft className="w-5 h-5" /> PREV
                    </button>
                    <button
                      onClick={() => setCurrentIndex(prev => Math.min(searchFilteredCards.length - 1, prev + 1))}
                      disabled={currentIndex === searchFilteredCards.length - 1}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-30 hover:bg-indigo-700 transition"
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
                <div key={card.id} className="bg-white dark:bg-[#13141f] rounded-3xl p-8 border border-gray-200 dark:border-white/5 hover:border-indigo-500/30 transition shadow-xl relative group">

                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{card.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 line-clamp-2 text-sm mb-4">{card.content}</p>
                  <button onClick={() => { setCurrentIndex(idx); setViewMode('card'); }} className="text-indigo-500 font-bold text-sm hover:underline">View Card</button>
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
