import React from 'react';
import type { Quiz } from '../../types';
import { Trophy, Swords, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ChallengeScreenProps {
    challenge: {
        creatorName: string;
        scoreToBeat: number;
        quiz: Quiz;
    };
    onStart: () => void;
    onCancel: () => void;
}

const ChallengeScreen: React.FC<ChallengeScreenProps> = ({ challenge, onStart, onCancel }) => {
    const { isBento } = useTheme();

    return (
        <div className={`min-h-screen flex items-center justify-center p-6 ${
            isBento
                ? 'bg-[#f5f3ec]'
                : 'bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-indigo-900'
        }`}>
            <div className={`max-w-md w-full p-8 text-center animate-in zoom-in duration-300 ${
                isBento
                    ? 'bg-white border-[3px] border-black rounded-2xl shadow-[8px_8px_0px_#000]'
                    : 'bg-white dark:bg-white/10 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-white/20 shadow-2xl'
            }`}>
                <div className={`w-20 h-20 flex items-center justify-center mx-auto mb-6 ${
                    isBento
                        ? 'bg-[#fed7aa] border-2 border-black rounded-2xl text-black shadow-[4px_4px_0px_#000]'
                        : 'bg-gradient-to-tr from-orange-500 to-red-500 rounded-full text-white shadow-orange-500/50 shadow-lg'
                }`}>
                    <Swords className="w-10 h-10" />
                </div>

                <h1 className={`text-3xl font-black mb-2 uppercase tracking-tight ${isBento ? 'text-black' : 'text-gray-900 dark:text-white'}`}>
                    Challenge Accepted!
                </h1>
                <p className={`mb-8 ${isBento ? 'text-gray-700 font-bold' : 'text-gray-600 dark:text-indigo-200 font-medium'}`}>
                    <span className={`font-black ${isBento ? 'text-black underline decoration-2' : 'text-orange-500 dark:text-orange-400'}`}>
                        {challenge.creatorName}
                    </span> has challenged you to beat their score in:
                </p>

                <div className={`rounded-2xl p-6 mb-8 ${
                    isBento
                        ? 'bg-[#f5f3ec] border-2 border-black shadow-[3px_3px_0px_#000]'
                        : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10'
                }`}>
                    <h2 className={`text-xl font-bold mb-1 ${isBento ? 'text-black font-black' : 'text-gray-900 dark:text-white'}`}>{challenge.quiz.title}</h2>
                    <p className={`text-sm mb-4 ${isBento ? 'text-gray-600' : 'text-gray-500 dark:text-indigo-300'}`}>{challenge.quiz.description}</p>

                    <div className={`flex items-center justify-center gap-2 text-3xl font-black ${
                        isBento ? 'text-black' : 'text-orange-500 dark:text-orange-400'
                    }`}>
                        <Trophy className={`w-8 h-8 ${isBento ? 'text-yellow-500 fill-yellow-400' : ''}`} />
                        {challenge.scoreToBeat}
                    </div>
                    <p className={`text-xs uppercase tracking-widest mt-1 ${isBento ? 'text-gray-600 font-black' : 'text-gray-400 dark:text-indigo-400'}`}>Target Score</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onStart}
                        className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 group ${
                            isBento
                                ? 'bg-[#bef264] hover:bg-[#a3e635] text-black border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 font-bold'
                        }`}
                    >
                        Start Challenge
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={onCancel}
                        className={`w-full py-3 rounded-xl transition-all ${
                            isBento
                                ? 'text-black font-black border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5'
                                : 'text-gray-500 hover:text-gray-700 dark:text-indigo-300 dark:hover:text-white font-medium'
                        }`}
                    >
                        Browse Other Quizzes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChallengeScreen;
