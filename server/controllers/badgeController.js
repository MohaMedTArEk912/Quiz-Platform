import { Badge } from '../models/Badge.js';

export const getBadges = async (req, res) => {
    try {
        const badges = await Badge.find({}).lean();
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching badges', error: error.message });
    }
};

export const createBadge = async (req, res) => {
    try {
        const badgeData = req.body;
        const newBadge = new Badge(badgeData);
        await newBadge.save();
        res.status(201).json(newBadge);
    } catch (error) {
        res.status(500).json({ message: 'Error creating badge', error: error.message });
    }
};

export const deleteBadge = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Badge.findOneAndDelete({ id });
        if (!result) {
            return res.status(404).json({ message: 'Badge not found' });
        }
        res.json({ message: 'Badge deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting badge', error: error.message });
    }
};
