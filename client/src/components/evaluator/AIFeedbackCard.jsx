import React from 'react';
import { FiCpu, FiInfo, FiCheckCircle } from 'react-icons/fi';

const AIFeedbackCard = ({ aiScore, maxMarks, reasoning, keywordsHit = [] }) => {
    return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <FiCpu className="animate-pulse" />
                    <span className="font-bold text-sm tracking-wide uppercase">AI Evaluator Analysis</span>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded-full text-white text-xs font-black">
                    Suggested: {aiScore} / {maxMarks}
                </div>
            </div>

            <div className="p-4">
                <div className="flex gap-3 mb-4">
                    <div className="mt-1 text-indigo-400">
                        <FiInfo size={18} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-black text-indigo-900 uppercase mb-1 tracking-tight">AI Reasoning</h4>
                        <p className="text-sm text-indigo-800 leading-relaxed font-medium">
                            {reasoning || 'No automated reasoning provided.'}
                        </p>
                    </div>
                </div>

                {keywordsHit.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-400 uppercase w-full mb-1">Keywords Detected</span>
                        {keywordsHit.map((keyword, i) => (
                            <span key={i} className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded-md text-[10px] font-bold">
                                <FiCheckCircle size={10} /> {keyword}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIFeedbackCard;
