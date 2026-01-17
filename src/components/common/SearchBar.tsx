import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    resultCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, resultCount }) => {
    return (
        <div className="flex items-center gap-4 mb-6 bg-white dark:bg-[#13141f] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
            <Search className="w-5 h-5 text-gray-400" />
            <input
                type="text"
                placeholder="Search quizzes by title or description..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 font-medium"
            />
            <span className="text-xs text-gray-400 font-medium">
                {resultCount} results
            </span>
        </div>
    );
};

export default SearchBar;
