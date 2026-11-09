import React, { useEffect, useState, useMemo } from 'react';
import type { SkillModule, SkillTrack, UserData, BadgeTree, BadgeNode, Badge, BadgeTreeNode } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import {
  Target,
  Lock,
  ChevronDown,
  Sparkles,
  Search,
  Compass,
  LayoutGrid,
  GitBranch,
  Volume2,
  VolumeX,
  BookOpen,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import SkillTreeVisualization from '../tracks/SkillTreeVisualization';
import { StorylineOdysseyView } from '../tracks/StorylineOdysseyView';
import { sounds } from '../../lib/soundEffects';
import { useNavigate } from 'react-router-dom';

interface SkillTracksProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

interface ModuleNode {
  module: SkillModule;
  badges: BadgeNode[];
  isCompleted: boolean;
  isLocked: boolean;
}

const SkillTracks: React.FC<SkillTracksProps> = ({ user, onUserUpdate }) => {
  const { isBento } = useTheme();
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<SkillTrack[]>([]);
  const [badgeTrees, setBadgeTrees] = useState<Record<string, BadgeTree>>({});
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'odyssey' | 'grid' | 'tree'>('odyssey');
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(sounds.getIsMuted());

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const load = async () => {
      try {
        const loadedTracks = await api.getSkillTracks();
        const safeTracks = Array.isArray(loadedTracks) ? loadedTracks : [];
        setTracks(safeTracks);

        if (safeTracks.length > 0 && !selectedTrackId) {
          // Select user's primary track if matching, else first track
          const primary = safeTracks.find(t => user?.primaryTrackId && t.subjectId === user.primaryTrackId);
          setSelectedTrackId(primary ? primary.trackId : safeTracks[0].trackId);
        }

        // Load badge trees for each track
        const trees = await api.getBadgeTrees({ type: 'track', isActive: true });
        const treeMap: Record<string, BadgeTree> = {};

        const safeTrees = Array.isArray(trees) ? trees : [];
        for (const tree of safeTrees) {
          if (tree.trackId) {
            const nodesWithBadges = await Promise.all(
              (Array.isArray(tree.nodes) ? tree.nodes : []).map(async (node: BadgeTreeNode) => {
                try {
                  const badge = await api.getBadgeNode(node.badgeId);
                  return { ...node, badge };
                } catch (err) {
                  console.error(`Failed to load badge ${node.badgeId}:`, err);
                  return node;
                }
              })
            );
            treeMap[tree.trackId] = { ...tree, nodes: nodesWithBadges };
          }
        }
        setBadgeTrees(treeMap);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, []);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsSoundMuted(muted);
    if (!muted) sounds.playClick();
  };

  const complete = async (trackId: string, moduleId: string, moduleName: string) => {
    try {
      setCompletingId(moduleId);
      sounds.playPowerUp();
      const res = await api.completeSkillModule(trackId, moduleId, user?.userId || '');

      // Update user skillTracks locally
      if (user) {
        onUserUpdate({ ...user, skillTracks: res.skillTracks });
      }

      // Check if any new badges were unlocked
      if (res.newBadges && res.newBadges.length > 0) {
        const badgeNames = res.newBadges.map((b: Badge) => b.name).join(', ');
        setMessage(`${moduleName} completed! 🎉 Unlocked: ${badgeNames}`);

        // Extra celebration for badges
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#A855F7', '#EC4899', '#F59E0B', '#10B981']
        });
      } else {
        setMessage(`${moduleName} conquered! 🎉`);

        // Regular celebration
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#6EE7B7']
        });
      }

      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setCompletingId(null);
    }
  };

  const getModuleNodes = (track: SkillTrack): ModuleNode[] => {
    const userTrack = user?.skillTracks?.find(t => t.trackId === track.trackId);
    const completedModules = userTrack?.completedModules || [];
    const badgeTree = badgeTrees[track.trackId];
    const modules = Array.isArray(track.modules) ? track.modules : [];

    return modules.map((module, index) => {
      const isCompleted = completedModules.includes(module.moduleId);
      const isLocked = index > 0 && !completedModules.includes(modules[index - 1].moduleId);

      // Get badges for this module
      const moduleBadges: BadgeNode[] = [];
      if (badgeTree) {
        badgeTree.nodes.forEach((node: BadgeTreeNode) => {
          const badgeModuleIndex = node.position?.tier || 0;
          if (badgeModuleIndex === index && node.badge) {
            moduleBadges.push(node.badge);
          }
        });
      }

      return {
        module,
        badges: moduleBadges,
        isCompleted,
        isLocked
      };
    });
  };

  const getEarnedBadgeIds = (): string[] => {
    return user?.badges?.map(b => b.id) || [];
  };

  // Categories
  const categories = useMemo(() => {
    return ['All', ...new Set((Array.isArray(tracks) ? tracks : []).map(t => t.category || 'General'))];
  }, [tracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      if (selectedCategory !== 'All' && (track.category || 'General') !== selectedCategory) {
        return false;
      }
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch = (track.title || '').toLowerCase().includes(q) ||
        (track.description || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;

      const userTrack = user.skillTracks?.find(t => t.trackId === track.trackId);
      const completedModules = userTrack?.completedModules || [];

      if (statusFilter === 'completed') {
        return completedModules.length === track.modules.length;
      } else if (statusFilter === 'in-progress') {
        return completedModules.length > 0 && completedModules.length < track.modules.length;
      } else if (statusFilter === 'not-started') {
        return completedModules.length === 0;
      }
      return true;
    });
  }, [tracks, selectedCategory, searchQuery, statusFilter, user.skillTracks]);

  // Active track for the Storyline Odyssey View
  const activeTrack = useMemo(() => {
    if (!selectedTrackId && filteredTracks.length > 0) return filteredTracks[0];
    return tracks.find(t => t.trackId === selectedTrackId) || filteredTracks[0] || null;
  }, [tracks, selectedTrackId, filteredTracks]);

  if (error) {
    return (
      <div className="w-full px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-500 dark:text-red-400 font-bold text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Narrative Hero Header */}
      <div className={`p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden transition-all ${
        isBento
          ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
          : 'bg-white/70 dark:bg-[#0c101c]/80 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xl backdrop-blur-xl'
      }`}>
        {/* Subtle Decorative Ambient Orb */}
        {!isBento && (
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3 select-none">
              <span className={`px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                isBento
                  ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                  : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
              }`}>
                <Compass className="w-3.5 h-3.5" />
                Chronicles of Mastery
              </span>
            </div>

            <h1 className={`text-2xl sm:text-4xl font-black tracking-tight mb-2 ${
              isBento ? 'text-black uppercase font-mono' : 'text-slate-900 dark:text-white'
            }`}>
              Interactive Skill Odyssey
            </h1>

            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${
              isBento ? 'text-slate-800 font-medium' : 'text-slate-600 dark:text-slate-300'
            }`}>
              Traverse the developer’s episodic journey. Scroll horizontally through progressive story chapters, conquer practical challenges, and unlock ancient artifacts of architectural wisdom.
            </p>
          </div>

          {/* View Mode & Sound Controls */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* View Mode Switcher */}
            <div className={`p-1 rounded-2xl flex items-center gap-1 ${
              isBento
                ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm'
            }`}>
              <button
                type="button"
                onClick={() => { sounds.playClick(); setViewMode('odyssey'); }}
                title="Storyline Odyssey (Horizontal Scroll)"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'odyssey'
                    ? isBento
                      ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : isBento
                      ? 'text-black hover:bg-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Odyssey</span>
              </button>

              <button
                type="button"
                onClick={() => { sounds.playClick(); setViewMode('grid'); }}
                title="Atlas Grid (All Chapters)"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? isBento
                      ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : isBento
                      ? 'text-black hover:bg-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Atlas Grid</span>
              </button>

              <button
                type="button"
                onClick={() => { sounds.playClick(); setViewMode('tree'); }}
                title="Constellation Node Tree"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  viewMode === 'tree'
                    ? isBento
                      ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : isBento
                      ? 'text-black hover:bg-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Node Tree</span>
              </button>
            </div>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={isSoundMuted ? "Enable sound effects" : "Mute sound effects"}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                isBento
                  ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000] hover:bg-yellow-50 text-black'
                  : 'bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chronicle Track Selector Carousel */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
            isBento ? 'text-black font-mono' : 'text-slate-700 dark:text-slate-300'
          }`}>
            <BookOpen className="w-4 h-4 text-indigo-500" />
            Select Chronicle Saga ({filteredTracks.length})
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            Choose a path to journey through
          </span>
        </div>

        <div className={`grid gap-3 ${
          filteredTracks.length <= 1
            ? 'grid-cols-1'
            : filteredTracks.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : filteredTracks.length === 3
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}>
          {filteredTracks.map(track => {
            const isSelected = track.trackId === activeTrack?.trackId;
            const userTrack = user.skillTracks?.find(t => t.trackId === track.trackId);
            const compCount = userTrack?.completedModules?.length || 0;
            const totalMod = track.modules?.length || 0;
            const pct = totalMod > 0 ? Math.round((compCount / totalMod) * 100) : 0;

            return (
              <button
                key={track.trackId}
                type="button"
                onClick={() => { sounds.playClick(); setSelectedTrackId(track.trackId); }}
                className={`p-3.5 rounded-2xl transition-all text-left flex items-center gap-3.5 w-full min-w-0 cursor-pointer ${
                  isSelected
                    ? isBento
                      ? 'bg-[#bef264] text-black border-[2.5px] border-black shadow-[4px_4px_0px_#000] scale-[1.01]'
                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]'
                    : isBento
                      ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-50'
                      : 'bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white hover:border-indigo-400'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                  isSelected
                    ? isBento ? 'bg-white text-black border-2 border-black' : 'bg-white/20 text-white'
                    : isBento ? 'bg-yellow-100 text-black border border-black' : 'bg-slate-100 dark:bg-white/10'
                }`}>
                  {track.icon || '📚'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`font-black text-xs sm:text-sm truncate ${
                    isSelected ? (isBento ? 'text-black' : 'text-white') : ''
                  }`}>
                    {track.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className={isSelected ? (isBento ? 'text-black/80 font-bold' : 'text-white/80') : 'text-slate-500 dark:text-slate-400'}>
                      {compCount}/{totalMod} Conquered
                    </span>
                    <span className={`font-black ${isSelected ? (isBento ? 'text-black' : 'text-white') : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search chapters, concepts, or algorithms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm focus:outline-none transition-all ${
              isBento
                ? 'bg-white text-black placeholder-black/50 border-2 border-black shadow-[3px_3px_0px_#000] font-bold focus:ring-2 focus:ring-black'
                : 'bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-indigo-500/40'
            }`}
          />
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
            isBento ? 'text-black' : 'text-slate-400'
          }`} />
        </div>

        {/* Category Picker */}
        <div className="relative w-full sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full appearance-none px-4 py-2.5 pr-10 rounded-2xl text-xs sm:text-sm focus:outline-none cursor-pointer transition-all ${
              isBento
                ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] font-black hover:bg-yellow-50'
                : 'bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-sm'
            }`}
          >
            {categories.map(c => (
              <option key={c} value={c} className="bg-white text-black dark:bg-[#0f1422] dark:text-white">{c}</option>
            ))}
          </select>
          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
            isBento ? 'text-black' : 'text-slate-400'
          }`} />
        </div>

        {/* Status Filters */}
        <div className={`p-1 rounded-2xl flex gap-1 overflow-x-auto ${
          isBento
            ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10'
        }`}>
          {(['all', 'in-progress', 'completed', 'not-started'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => { sounds.playClick(); setStatusFilter(filter); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === filter
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[1.5px_1.5px_0px_#000]'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'in-progress' ? 'In Progress' : filter === 'completed' ? 'Completed' : 'Not Started'}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Toast Banner */}
      {message && (
        <div className={`p-4 rounded-2xl text-center text-xs sm:text-sm font-black flex items-center justify-center gap-2 animate-in fade-in duration-200 ${
          isBento
            ? 'bg-[#bbf7d0] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Dynamic View Modes */}
      {activeTrack ? (
        (() => {
          const moduleNodes = getModuleNodes(activeTrack);
          const earnedBadges = getEarnedBadgeIds();
          const isUnlocked =
            user.role === 'admin' ||
            !activeTrack.subjectId ||
            (user.unlockedTracks || []).map(id => id.toString()).includes(activeTrack.subjectId.toString()) ||
            user.primaryTrackId?.toString() === activeTrack.subjectId.toString();

          if (!isUnlocked) {
            return (
              <div className={`p-8 sm:p-12 rounded-[2.5rem] text-center transition-all relative overflow-hidden ${
                isBento
                  ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                  : 'bg-white/80 dark:bg-[#0c101c]/80 text-slate-900 dark:text-white border border-amber-500/30 shadow-2xl backdrop-blur-xl'
              }`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  isBento
                    ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-lg shadow-amber-500/20'
                }`}>
                  <Lock className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 block">
                  Runic Gateway Sealed
                </span>
                <h3 className={`text-xl sm:text-2xl font-black mb-2 ${isBento ? 'text-black font-mono' : 'text-white'}`}>
                  {activeTrack.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                  This sacred progression path is locked. Request track clearance from your dashboard roadmaps to embark upon this saga.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2 ${
                    isBento
                      ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
                  }`}
                >
                  <span>Go to Roads to Request Access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          }

          // 1. Signature Mode: Storyline Odyssey (Horizontal Storytelling Scroll)
          if (viewMode === 'odyssey') {
            return (
              <StorylineOdysseyView
                track={activeTrack}
                modules={moduleNodes}
                onCompleteModule={(modId, modTitle) => complete(activeTrack.trackId, modId, modTitle)}
                completingId={completingId}
              />
            );
          }

          // 2. Atlas Grid Mode
          if (viewMode === 'grid') {
            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-black uppercase tracking-wider ${
                    isBento ? 'text-black font-mono' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {activeTrack.title} • Atlas Grid
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">
                    {moduleNodes.length} Total Chapters
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {moduleNodes.map((mNode, idx) => {
                    const { module, isCompleted, isLocked } = mNode;
                    return (
                      <div
                        key={module.moduleId || idx}
                        className={`p-6 rounded-[2rem] flex flex-col justify-between transition-all ${
                          isBento
                            ? 'bg-white text-black border-[3px] border-black shadow-[5px_5px_0px_#000]'
                            : isCompleted
                              ? 'bg-emerald-500/5 dark:bg-[#0c141d] border border-emerald-500/30 shadow-md'
                              : 'bg-white dark:bg-[#0c101c] border border-slate-200/80 dark:border-white/10 shadow-lg'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Chapter {idx + 1}
                            </span>
                            {isCompleted ? (
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mastered
                              </span>
                            ) : isLocked ? (
                              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" />
                                Locked
                              </span>
                            ) : (
                              <span className="text-xs font-black text-indigo-500 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                Available
                              </span>
                            )}
                          </div>

                          <h4 className={`text-base font-black mb-2 ${isBento ? 'text-black font-mono' : 'text-slate-900 dark:text-white'}`}>
                            {module.title}
                          </h4>

                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">
                            {module.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-500">
                            +{module.xpReward || 120} XP
                          </span>
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => complete(activeTrack.trackId, module.moduleId, module.title)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                isBento
                                  ? 'bg-[#bef264] text-black border border-black shadow-[2px_2px_0px_#000]'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                              }`}
                            >
                              {isCompleted ? 'Re-verify' : 'Complete'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // 3. Node Tree View
          return (
            <div className={`p-6 sm:p-8 rounded-[2.5rem] transition-all ${
              isBento
                ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
                : 'bg-white/80 dark:bg-[#0c101c]/80 border border-slate-200/80 dark:border-white/10 shadow-lg'
            }`}>
              <SkillTreeVisualization
                trackTitle={activeTrack.title}
                trackIcon={activeTrack.icon || '📚'}
                modules={moduleNodes}
                onModuleComplete={(moduleId, moduleName) => complete(activeTrack.trackId, moduleId, moduleName)}
                completingId={completingId}
                earnedBadges={earnedBadges}
              />
            </div>
          );
        })()
      ) : (
        <div className={`text-center py-20 rounded-[2.5rem] ${
          isBento
            ? 'bg-white text-black border-[3px] border-black shadow-[6px_6px_0px_#000]'
            : 'bg-white/80 dark:bg-[#0c101c]/80 border border-dashed border-slate-300 dark:border-white/10'
        }`}>
          <Target className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <p className="font-black text-base">No tracks match your current filter</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting the search query or status filter.</p>
        </div>
      )}
    </div>
  );
};

export default SkillTracks;
