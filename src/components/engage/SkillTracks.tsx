import React, { useEffect, useState } from 'react';
import type { SkillModule, SkillTrack, UserData, BadgeTree, BadgeNode } from '../../types';
import { api } from '../../lib/api';
import { Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import SkillTreeVisualization from '../tracks/SkillTreeVisualization';

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
  const [tracks, setTracks] = useState<SkillTrack[]>([]);
  const [badgeTrees, setBadgeTrees] = useState<Record<string, BadgeTree>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const loadedTracks = await api.getSkillTracks();
        setTracks(loadedTracks);

        // Load badge trees for each track
        const trees = await api.getBadgeTrees({ type: 'track', isActive: true });
        const treeMap: Record<string, BadgeTree> = {};

        // Load all badge details for each tree
        for (const tree of trees) {
          if (tree.trackId) {
            // Fetch badge details for each node
            const nodesWithBadges = await Promise.all(
              tree.nodes.map(async (node: any) => {
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
      const res = await api.completeSkillModule(trackId, moduleId, user.userId);

      // Update user skillTracks locally
      onUserUpdate({ ...user, skillTracks: res.skillTracks });

      // Check if any new badges were unlocked
      if (res.newBadges && res.newBadges.length > 0) {
        const badgeNames = res.newBadges.map((b: any) => b.name).join(', ');
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
    const userTrack = user.skillTracks?.find(t => t.trackId === track.trackId);
    const completedModules = userTrack?.completedModules || [];
    const badgeTree = badgeTrees[track.trackId];

    return track.modules.map((module, index) => {
      const isCompleted = completedModules.includes(module.moduleId);
      const isLocked = index > 0 && !completedModules.includes(track.modules[index - 1].moduleId);

      // Get badges for this module
      const moduleBadges: BadgeNode[] = [];
      if (badgeTree) {
        badgeTree.nodes.forEach((node: any) => {
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
    return user.badges?.map(b => b.id) || [];
  };

  // Filter tracks based on search and status
  const filteredTracks = tracks.filter(track => {
    // Search filter
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.description?.toLowerCase().includes(searchQuery.toLowerCase());

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black text-white mb-4">Skill Progression Trees</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Follow the learning paths, complete modules, and earn badges as you progress through each skill tree.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search skill tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${statusFilter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('in-progress')}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${statusFilter === 'in-progress'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${statusFilter === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
          >
            Completed
          </button>
          <button
            onClick={() => setStatusFilter('not-started')}
            className={`px-4 py-3 rounded-xl font-semibold transition-all ${statusFilter === 'not-started'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
          >
            Not Started
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-green-400 text-center animate-pulse">
          {message}
        </div>
      )}

      {/* Skill Trees */}
      <div className="space-y-16">
        {filteredTracks.map(track => {
          const moduleNodes = getModuleNodes(track);
          const earnedBadges = getEarnedBadgeIds();

          return (
            <div key={track.trackId} className="bg-gray-900/50 rounded-3xl p-8 border border-gray-800">
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
          <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-3xl">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-bold text-lg">No tracks match your filters</p>
            <p className="text-gray-600 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        )}

        {tracks.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-3xl">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-bold text-lg">No skill tracks available yet</p>
            <p className="text-gray-600 text-sm mt-2">Check back soon for new learning paths!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillTracks;
