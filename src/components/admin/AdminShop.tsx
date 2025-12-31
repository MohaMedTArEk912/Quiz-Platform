import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { ShopItem } from '../../types';
import { Plus, Trash2, Edit2, ShoppingBag, Coins, Save, Upload, Download, Loader2, MoreVertical } from 'lucide-react';

const AdminShop: React.FC = () => {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<ShopItem>>({
        name: '',
        description: '',
        type: 'cosmetic',
        price: 100
    });

    const loadItems = async () => {
        try {
            const data = await api.getShopItems();
            setItems(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (isCreating) {
                await api.addShopItem(formData as ShopItem, 'admin');
            } else if (editingItem) {
                await api.updateShopItem(editingItem.itemId, { ...editingItem, ...formData } as ShopItem, 'admin');
            }

            await loadItems();
            resetForm();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await api.deleteShopItem(itemId, 'admin');
            await loadItems();
        } catch (err) {
            setError('Failed to delete item');
        }
    };

    const startEdit = (item: ShopItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsCreating(false);
    };

    const startCreate = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            type: 'cosmetic',
            price: 100
        });
        setIsCreating(true);
    };

    const resetForm = () => {
        setEditingItem(null);
        setIsCreating(false);
        setFormData({
            name: '',
            description: '',
            type: 'cosmetic',
            price: 100
        });
    };
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const downloadSample = () => {
        const sample = [
            {
                "name": "Cool Sunglasses",
                "description": "Stylish shades for your avatar",
                "type": "cosmetic",
                "price": 500,
                "payload": {
                    "attribute": "accessory",
                    "value": "sunglasses"
                }
            },
            {
                "name": "Extra Life",
                "description": "One extra chance per quiz",
                "type": "powerup",
                "price": 1000,
                "payload": {
                    "powerUpType": "extra_life",
                    "uses": 1
                }
            }
        ];
        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shop_items_sample.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) throw new Error('File must contain an array of items');

                setLoading(true);
                let successCount = 0;
                for (const item of json) {
                    if (!item.name || !item.price) continue;
                    // Strip itemId to ensure new creation
                    const { itemId, ...rest } = item;
                    await api.addShopItem(rest as any, 'admin');
                    successCount++;
                }

                await loadItems();
                alert(`Successfully imported ${successCount} items`);
            } catch (err) {
                console.error(err);
                setError('Failed to process file: ' + (err as Error).message);
            } finally {
                setLoading(false);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="p-8 text-center bg-white dark:bg-[#13141f] rounded-2xl animate-pulse">
        <Loader2 className="w-8 h-8 text-indigo-500 mx-auto animate-spin" />
        <p className="mt-2 text-gray-500">Loading shop...</p>
    </div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-purple-600" />
                        Shop Management
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage power-ups and cosmetic items</p>
                </div>
                {!isCreating && !editingItem && (
                    <div className="flex gap-3">
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-xl font-bold transition-all border border-gray-200 dark:border-gray-700"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={downloadSample}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm"
                                    >
                                        <Download className="w-4 h-4 text-purple-500" />
                                        Download Sample
                                    </button>
                                    <label className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 transition-colors font-medium text-sm cursor-pointer border-t border-gray-100 dark:border-gray-700">
                                        <Upload className="w-4 h-4 text-indigo-500" />
                                        Import JSON
                                        <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={startCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/30"
                        >
                            <Plus className="w-5 h-5" />
                            Add Item
                        </button>
                    </div>
                )}
            </div>

            {(isCreating || editingItem) && (
                <div className="bg-white dark:bg-[#13141f] p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-xl animate-in slide-in-from-top-4">
                    <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                        {isCreating ? 'Create New Item' : 'Edit Item'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Item Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="e.g. Golden Crown"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cost (Coins)</label>
                                <div className="relative">
                                    <Coins className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                                >
                                    <option value="cosmetic">Cosmetic / Style</option>
                                    <option value="powerup">Power-Up</option>
                                </select>
                            </div>

                            {/* Payload Config for Cosmetics */}
                            {formData.type === 'cosmetic' && (
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/10">
                                    <div className="md:col-span-2">
                                        <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-2">Style Configuration</h4>
                                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-4">When purchased, this item will unlock:</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attribute</label>
                                        <select
                                            value={(formData.payload as any)?.attribute || 'accessory'}
                                            onChange={e => setFormData({
                                                ...formData,
                                                payload: { ...(formData.payload || {}), attribute: e.target.value, value: '' }
                                            })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 outline-none transition-colors"
                                        >
                                            <option value="accessory">Accessory</option>
                                            <option value="hairStyle">Hair Style</option>
                                            <option value="hairColor">Hair Color</option>
                                            <option value="skinColor">Skin Color</option>
                                            <option value="backgroundColor">Background</option>
                                            <option value="mood">Mood</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Value ID</label>
                                        <input
                                            type="text"
                                            value={(formData.payload as any)?.value || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                payload: { ...(formData.payload || {}), value: e.target.value }
                                            })}
                                            className="w-full px-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-purple-500 outline-none transition-colors"
                                            placeholder="e.g. 'crown', '#FF0000'"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:border-indigo-500 outline-none transition-colors h-24 resize-none"
                                    placeholder="Describe what this item does..."
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all"
                            >
                                <Save className="w-4 h-4" />
                                {isCreating ? 'Create Item' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div >
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => (
                    <div
                        key={item.itemId}
                        className="group bg-white dark:bg-[#13141f] p-6 rounded-[2rem] border border-gray-200 dark:border-white/5 hover:border-indigo-500/50 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.type === 'cosmetic'
                                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                }`}>
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{item.name}</h4>
                                <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                                    <span className="capitalize px-2 py-0.5 rounded-md bg-gray-100 dark:bg-black/20">{item.type}</span>
                                    <span className="flex items-center gap-1">
                                        <Coins className="w-3 h-3" />
                                        {item.price}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEdit(item)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(item.itemId)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold">No shop items found</p>
                </div>
            )}
        </div >
    );
};

export default AdminShop;
