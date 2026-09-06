import React, { useEffect, useState } from 'react';
import type { SkillModule, SkillTrack, UserData, BadgeTree, BadgeNode, Badge, BadgeTreeNode } from '../../types';
import { api } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Target, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import SkillTreeVisualization from '../tracks/SkillTreeVisualization';
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
        setTracks(Array.isArray(loadedTracks) ? loadedTracks : []);

        // Load badge trees for each track
        const trees = await api.getBadgeTrees({ type: 'track', isActive: true });
        const treeMap: Record<string, BadgeTree> = {};

        const safeTrees = Array.isArray(trees) ? trees : [];
        for (const tree of safeTrees) {
          if (tree.trackId) {
            // Fetch badge details for each node
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

  const complete = async (trackId: string, moduleId: string, moduleName: string) => {
    try {
      setCompletingId(moduleId);
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
        setMessage(`${moduleName} completed! 🎉`);

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
          // Match badges to modules by position or tier
          // For now, distribute badges evenly across modules
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

  // Extract unique categories
  const categories = ['All', ...new Set((Array.isArray(tracks) ? tracks : []).map(t => t.category || 'General'))];

  // Filter tracks based on search, category and status
  const filteredTracks = tracks.filter(track => {
    // Category filter
    if (selectedCategory !== 'All' && (track.category || 'General') !== selectedCategory) {
      return false;
    }

    // Search filter
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = (track.title || '').toLowerCase().includes(q) ||
      (track.description || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Status filter
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

  if (error) {
    return (
      <div className="w-full px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className={`mb-8 text-center transition-all ${
        isBento
          ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000] p-6 sm:p-8 rounded-3xl'
          : ''
      }`}>
        <h1 className={`text-3xl sm:text-4xl font-black mb-2 tracking-tight ${
          isBento ? 'text-black uppercase' : 'text-slate-900 dark:text-white'
        }`}>
          Skill Progression Trees
        </h1>
        <p className={`text-sm max-w-xl mx-auto ${
          isBento ? 'text-black/70 font-semibold' : 'text-slate-500 dark:text-slate-400'
        }`}>
          Master competencies along structured learning paths, unlock mastery nodes, and collect credentials as you progress.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="mb-8 flex flex-col lg:flex-row gap-3">
        {/* Search Bar */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search skill tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none transition-all ${
              isBento
                ? 'bg-white text-black placeholder-black/50 border-2 border-black shadow-[3px_3px_0px_#000] font-bold focus:ring-2 focus:ring-black'
                : 'glass-card text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/40 shadow-sm'
            }`}
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-2xl text-sm focus:outline-none cursor-pointer ${
                isBento
                  ? 'bg-white text-black border-2 border-black shadow-[3px_3px_0px_#000] font-black focus:ring-2 focus:ring-black'
                  : 'glass-card text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/40 shadow-sm'
              }`}
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-white text-black dark:bg-[#0f1422] dark:text-white font-bold">{category}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className={`p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto transition-all ${
            isBento
              ? 'bg-white border-2 border-black shadow-[3px_3px_0px_#000]'
              : 'glass-panel shadow-sm'
          }`}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('in-progress')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'in-progress'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'completed'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('not-started')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'not-started'
                  ? isBento
                    ? 'bg-[#bef264] text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-slate-700 text-white'
                  : isBento
                    ? 'text-black/70 hover:bg-black/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              Not Started
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl text-center text-sm font-black ${
          isBento
            ? 'bg-[#bbf7d0] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
        }`}>
          {message}
        </div>
      )}

      {/* Skill Trees */}
      <div className="space-y-10">
        {filteredTracks.map(track => {
          const moduleNodes = getModuleNodes(track);
          const earnedBadges = getEarnedBadgeIds();
          const isUnlocked =
            user.role === 'admin' ||
            !track.subjectId ||
            (user.unlockedTracks || []).map(id => id.toString()).includes(track.subjectId.toString()) ||
            user.primaryTrackId?.toString() === track.subjectId.toString();

          if (!isUnlocked) {
            return (
              <div key={track.trackId} className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden transition-all ${
                isBento
                  ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                  : 'glass-card border border-amber-500/30 shadow-md'
              }`}>
                <div className="filter blur-[3px] opacity-35 pointer-events-none select-none">
                  <SkillTreeVisualization
                    trackTitle={track.title}
                    trackIcon="📚"
                    modules={moduleNodes}
                    onModuleComplete={() => {}}
                    completingId={null}
                    earnedBadges={earnedBadges}
                  />
                </div>
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm rounded-3xl text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                    isBento
                      ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/20'
                  }`}>
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    isBento ? 'text-[#fde047]' : 'text-amber-400'
                  }`}>Track Locked</span>
                  <h3 className="text-lg font-black text-white tracking-tight mb-2">{track.title}</h3>
                  <p className="text-xs text-slate-300 max-w-sm mb-5">This progression path is restricted. Request access from your dashboard to unlock this track.</p>
                  <button
                    onClick={() => navigate('/')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isBento
                        ? 'bg-[#fde047] text-black border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5'
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.985] text-white shadow-lg shadow-indigo-600/25'
                    }`}
                  >
                    Go to Roads to Request Access
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={track.trackId} className={`rounded-3xl p-6 sm:p-8 transition-all ${
              isBento
                ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
                : 'glass-card border border-slate-200/80 dark:border-white/10 shadow-sm'
            }`}>
              <SkillTreeVisualization
                trackTitle={track.title}
                trackIcon="📚"
                modules={moduleNodes}
                onModuleComplete={(moduleId, moduleName) => complete(track.trackId, moduleId, moduleName)}
                completingId={completingId}
                earnedBadges={earnedBadges}
              />
            </div>
          );
        })}

        {filteredTracks.length === 0 && tracks.length > 0 && (
          <div className={`text-center py-16 rounded-3xl ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'glass-card border border-dashed border-slate-300 dark:border-white/10'
          }`}>
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <p className={`font-black text-base ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>No tracks match your filters</p>
            <p className={`text-xs mt-1 ${isBento ? 'text-black/70' : 'text-slate-500'}`}>Try adjusting your search keywords or filter pills.</p>
          </div>
        )}

        {tracks.length === 0 && (
          <div className={`text-center py-16 rounded-3xl ${
            isBento
              ? 'bg-white text-black border-3 border-black shadow-[6px_6px_0px_#000]'
              : 'glass-card border border-dashed border-slate-300 dark:border-white/10'
          }`}>
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <p className={`font-black text-base ${isBento ? 'text-black' : 'text-slate-700 dark:text-slate-300'}`}>No skill tracks available yet</p>
            <p className={`text-xs mt-1 ${isBento ? 'text-black/70' : 'text-slate-500'}`}>Check back soon for new learning paths!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTracks;
