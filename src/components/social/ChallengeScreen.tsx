import React from 'react';
import type { Quiz } from '../../types';
import { Trophy, Swords, ArrowRight } from 'lucide-react';

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
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-orange-500/50 shadow-lg">
                    <Swords className="w-10 h-10 text-white" />
                </div>

                <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Challenge Accepted!</h1>
                <p className="text-indigo-200 mb-8 font-medium">
                    <span className="text-orange-400 font-bold">{challenge.creatorName}</span> has challenged you to beat their score in:
                </p>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8">
                    <h2 className="text-xl font-bold text-white mb-1">{challenge.quiz.title}</h2>
                    <p className="text-sm text-indigo-300 mb-4">{challenge.quiz.description}</p>

                    <div className="flex items-center justify-center gap-2 text-3xl font-black text-orange-400">
                        <Trophy className="w-8 h-8" />
                        {challenge.scoreToBeat}
                    </div>
                    <p className="text-xs text-indigo-400 uppercase tracking-widest mt-1">Target Score</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onStart}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 group"
                    >
                        Start Challenge
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 text-indigo-300 hover:text-white font-medium transition-colors"
                    >
                        Browse Other Quizzes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChallengeScreen;
