import { BadgeTree } from '../models/BadgeTree.js';
import { BadgeNode } from '../models/BadgeNode.js';
import { User } from '../models/User.js';

// Create a new badge tree
export const createBadgeTree = async (req, res) => {
  try {
    const tree = new BadgeTree(req.body);
    await tree.save();
    res.status(201).json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Error creating badge tree', error: error.message });
  }
};

// Get all badge trees
export const getAllBadgeTrees = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const trees = await BadgeTree.find(filter).sort({ createdAt: -1 });
    res.json(trees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching badge trees', error: error.message });
  }
};

// Get single badge tree with populated badge nodes
export const getBadgeTree = async (req, res) => {
  try {
    const tree = await BadgeTree.findOne({ treeId: req.params.treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Badge tree not found' });
    }
    
    // Populate badge node details
    const badgeIds = tree.nodes.map(n => n.badgeId);
    const badges = await BadgeNode.find({ badgeId: { $in: badgeIds } });
    
    // Create a map for quick lookup
    const badgeMap = {};
    badges.forEach(b => {
      badgeMap[b.badgeId] = b;
    });
    
    // Enhance nodes with badge details
    const enhancedNodes = tree.nodes.map(node => ({
      ...node.toObject(),
      badge: badgeMap[node.badgeId] || null
    }));
    
    res.json({
      ...tree.toObject(),
      nodes: enhancedNodes
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching badge tree', error: error.message });
  }
};

// Update badge tree
export const updateBadgeTree = async (req, res) => {
  try {
    const tree = await BadgeTree.findOneAndUpdate(
      { treeId: req.params.treeId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!tree) {
      return res.status(404).json({ message: 'Badge tree not found' });
    }
    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Error updating badge tree', error: error.message });
  }
};

// Delete badge tree
export const deleteBadgeTree = async (req, res) => {
  try {
    const tree = await BadgeTree.findOneAndDelete({ treeId: req.params.treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Badge tree not found' });
    }
    res.json({ message: 'Badge tree deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting badge tree', error: error.message });
  }
};

// Add badge node to tree
export const addNodeToTree = async (req, res) => {
  try {
    const { treeId } = req.params;
    const { badgeId, position, prerequisites, isRoot, isSpecial } = req.body;
    
    // Verify badge exists
    const badge = await BadgeNode.findOne({ badgeId });
    if (!badge) {
      return res.status(404).json({ message: 'Badge not found' });
    }
    
    const tree = await BadgeTree.findOne({ treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Tree not found' });
    }
    
    // Check if badge already in tree
    if (tree.nodes.some(n => n.badgeId === badgeId)) {
      return res.status(400).json({ message: 'Badge already in tree' });
    }
    
    // Add node
    tree.nodes.push({
      badgeId,
      position: position || { x: 0, y: 0, tier: 0 },
      prerequisites: prerequisites || [],
      isRoot: isRoot || false,
      isSpecial: isSpecial || false
    });
    
    // Add tree to badge's trees array
    if (!badge.trees.includes(treeId)) {
      badge.trees.push(treeId);
      await badge.save();
    }
    
    await tree.save();
    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Error adding node to tree', error: error.message });
  }
};

// Update node in tree
export const updateNodeInTree = async (req, res) => {
  try {
    const { treeId, badgeId } = req.params;
    const updates = req.body;
    
    const tree = await BadgeTree.findOne({ treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Tree not found' });
    }
    
    const nodeIndex = tree.nodes.findIndex(n => n.badgeId === badgeId);
    if (nodeIndex === -1) {
      return res.status(404).json({ message: 'Node not found in tree' });
    }
    
    // Update node properties
    if (updates.position) tree.nodes[nodeIndex].position = updates.position;
    if (updates.prerequisites !== undefined) tree.nodes[nodeIndex].prerequisites = updates.prerequisites;
    if (updates.isRoot !== undefined) tree.nodes[nodeIndex].isRoot = updates.isRoot;
    if (updates.isSpecial !== undefined) tree.nodes[nodeIndex].isSpecial = updates.isSpecial;
    
    await tree.save();
    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Error updating node', error: error.message });
  }
};

// Remove node from tree
export const removeNodeFromTree = async (req, res) => {
  try {
    const { treeId, badgeId } = req.params;
    
    const tree = await BadgeTree.findOne({ treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Tree not found' });
    }
    
    // Remove node
    tree.nodes = tree.nodes.filter(n => n.badgeId !== badgeId);
    
    // Remove tree from badge's trees array
    const badge = await BadgeNode.findOne({ badgeId });
    if (badge) {
      badge.trees = badge.trees.filter(t => t !== treeId);
      await badge.save();
    }
    
    await tree.save();
    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Error removing node from tree', error: error.message });
  }
};

// Get user's badge progress for all trees
export const getUserBadgeProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const trees = await BadgeTree.find({ isActive: true });
    const progress = [];
    
    for (const tree of trees) {
      const totalBadges = tree.nodes.length;
      const earnedBadgeIds = new Set(user.badges.map(b => b.id));
      const earnedCount = tree.nodes.filter(n => earnedBadgeIds.has(n.badgeId)).length;
      
      // Find next unlockable badges
      const nextUnlockable = [];
      for (const node of tree.nodes) {
        if (earnedBadgeIds.has(node.badgeId)) continue;
        
        // Check if prerequisites are met
        const hasPrereqs = node.prerequisites.every(prereqId => earnedBadgeIds.has(prereqId));
        if (hasPrereqs) {
          const badge = await BadgeNode.findOne({ badgeId: node.badgeId });
          if (badge) {
            nextUnlockable.push(badge);
          }
        }
      }
      
      // Get recently earned badges from this tree
      const treeNodeIds = new Set(tree.nodes.map(n => n.badgeId));
      const recentlyEarned = user.badges
        .filter(b => treeNodeIds.has(b.id))
        .sort((a, b) => new Date(b.dateEarned) - new Date(a.dateEarned))
        .slice(0, 3);
      
      progress.push({
        treeId: tree.treeId,
        treeName: tree.name,
        treeType: tree.type,
        treeIcon: tree.icon,
        totalBadges,
        earnedBadges: earnedCount,
        progress: totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0,
        nextUnlockable: nextUnlockable.slice(0, 3), // Top 3
        recentlyEarned
      });
    }
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user progress', error: error.message });
  }
};

// Get user's progress for specific tree
export const getUserTreeProgress = async (req, res) => {
  try {
    const { userId, treeId } = req.params;
    
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const tree = await BadgeTree.findOne({ treeId });
    if (!tree) {
      return res.status(404).json({ message: 'Tree not found' });
    }
    
    const earnedBadgeIds = new Set(user.badges.map(b => b.id));
    
    // Get all badge details
    const badgeIds = tree.nodes.map(n => n.badgeId);
    const badges = await BadgeNode.find({ badgeId: { $in: badgeIds } });
    const badgeMap = {};
    badges.forEach(b => {
      badgeMap[b.badgeId] = b;
    });
    
    // Enhance nodes with unlock status
    const enhancedNodes = tree.nodes.map(node => {
      const isUnlocked = earnedBadgeIds.has(node.badgeId);
      const hasPrereqs = node.prerequisites.every(prereqId => earnedBadgeIds.has(prereqId));
      const badge = badgeMap[node.badgeId];
      
      return {
        ...node.toObject(),
        badge,
        isUnlocked,
        canUnlock: !isUnlocked && hasPrereqs,
        userBadge: user.badges.find(b => b.id === node.badgeId) || null
      };
    });
    
    res.json({
      tree: tree.toObject(),
      nodes: enhancedNodes,
      totalBadges: tree.nodes.length,
      earnedBadges: tree.nodes.filter(n => earnedBadgeIds.has(n.badgeId)).length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tree progress', error: error.message });
  }
};
