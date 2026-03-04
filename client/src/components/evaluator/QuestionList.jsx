import React from 'react';
import Badge from '@/components/common/Badge';

const QuestionList = ({ questions, activeQuestionId, onSelectQuestion, type = 'MCQ' }) => {
    const getStatusConfig = (q) => {
        if (type === 'MCQ' || type === 'TrueFalse') {
            if (!q.studentAnswer) return { variant: 'secondary', label: 'Skipped', color: 'bg-gray-400' };
            return q.isCorrect
                ? { variant: 'success', label: 'Correct', color: 'bg-green-500' }
                : { variant: 'danger', label: 'Wrong', color: 'bg-red-500' };
        }

        // Descriptive
        if (q.isManuallyEvaluated) return { variant: 'success', label: 'Manually Reviewed', color: 'bg-blue-500' };
        if (q.aiScore !== undefined) return { variant: 'info', label: 'AI Evaluated', color: 'bg-indigo-500' };
        return { variant: 'warning', label: 'Pending Review', color: 'bg-amber-500' };
    };

    const truncate = (text, length = 60) => {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Question Navigator
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {questions.map((q, index) => {
                    const status = getStatusConfig(q);
                    const isActive = activeQuestionId === q._id;

                    return (
                        <button
                            key={q._id}
                            onClick={() => onSelectQuestion(q)}
                            className={`w-full text-left p-4 border-b border-gray-100 transition-all hover:bg-gray-50 group relative ${isActive ? 'bg-evaluator-accent/5 border-l-4 border-l-evaluator-accent' : 'border-l-4 border-l-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-black px-2 py-0.5 rounded ${isActive ? 'bg-evaluator-accent text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                                    Q{index + 1}
                                </span>
                                <Badge variant={status.variant} className="text-[10px] font-bold px-2">
                                    {status.label}
                                </Badge>
                            </div>
                            <p className={`text-sm ${isActive ? 'text-gray-900 font-bold' : 'text-gray-600 font-medium'} line-clamp-2`}>
                                {truncate(q.questionText || q.statement)}
                            </p>

                            {/* Vertical indicator dot */}
                            <div className={`absolute right-3 bottom-4 w-2 h-2 rounded-full ${status.color}`}></div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuestionList;
