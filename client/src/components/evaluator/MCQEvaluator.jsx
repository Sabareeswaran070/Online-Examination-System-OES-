import React, { useState } from 'react';

const getStatus = (q) => {
    if (!q.studentAnswer && q.studentAnswer !== false) return 'skipped';
    return q.isCorrect ? 'correct' : 'wrong';
};

const STATUS = {
    correct: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Correct' },
    wrong: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Wrong' },
    skipped: { dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500', label: 'Skipped' },
};

const MCQEvaluator = ({ questions, activeQuestion, onSelectQuestion }) => {
    const [selected, setSelected] = useState(activeQuestion || questions[0] || null);
    const q = selected || questions[0];

    const handleSelect = (item) => { setSelected(item); onSelectQuestion(item); };

    if (!questions.length) return (
        <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm bg-gray-50">
            No MCQ questions in this submission.
        </div>
    );

    const status = getStatus(q);
    const S = STATUS[status];

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Left — Question List */}
            <div className="w-72 flex-none border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MCQ Questions</p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {['correct', 'wrong', 'skipped'].map(s => {
                            const cnt = questions.filter(q => getStatus(q) === s).length;
                            if (!cnt) return null;
                            return <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[s].badge}`}>{cnt} {STATUS[s].label}</span>;
                        })}
                    </div>
                </div>
                {questions.map((item, i) => {
                    const st = getStatus(item);
                    const isActive = q?._id === item._id;
                    return (
                        <button key={item._id || i} onClick={() => handleSelect(item)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 flex gap-3 items-start transition-colors border-l-4 ${isActive ? 'bg-primary-50 border-l-primary-500' : 'hover:bg-gray-50 border-l-transparent'}`}>
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS[st].dot}`} />
                            <div className="min-w-0">
                                <p className={`text-xs font-bold mb-0.5 ${isActive ? 'text-primary-700' : 'text-gray-600'}`}>Q{i + 1}</p>
                                <p className={`text-xs leading-snug truncate-2 ${isActive ? 'text-gray-800' : 'text-gray-500'}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.questionText}
                                </p>
                                <span className={`mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS[st].badge}`}>{STATUS[st].label}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Right — Detail */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Q header */}
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">Q{(questions.indexOf(q) + 1) || 1}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${S.badge}`}>{S.label}</span>
                    </div>

                    {/* Question text */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-gray-900 font-semibold text-base leading-relaxed">{q.questionText}</p>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Options & Analysis</p>
                        {(q.options || []).map((opt, i) => {
                            const isCorrect = opt === q.correctAnswer;
                            const isStudent = opt === q.studentAnswer;
                            let cls = 'bg-white border-gray-200 text-gray-700';
                            let badgeBg = '';
                            if (isCorrect && isStudent) cls = 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-100';
                            else if (isStudent) cls = 'bg-red-50 border-red-400 text-red-900 ring-2 ring-red-100';
                            else if (isCorrect) cls = 'bg-emerald-50/60 border-emerald-200 text-emerald-800';

                            return (
                                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${cls}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                                        ${isCorrect ? 'bg-emerald-500 text-white' : isStudent ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="flex-1 font-medium text-sm">{opt}</span>
                                    <div className="flex gap-2">
                                        {isStudent && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>Student</span>}
                                        {isCorrect && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">Correct</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Wrong answer callout */}
                    {status === 'wrong' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
                            <span className="text-lg">⚠️</span>
                            <div>
                                <p className="text-red-800 font-bold text-sm">Incorrect Answer</p>
                                <p className="text-red-700 text-sm mt-0.5">Student selected <b>"{q.studentAnswer}"</b> — correct answer is <b>"{q.correctAnswer}"</b></p>
                            </div>
                        </div>
                    )}

                    {/* Score bar */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score Contribution</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black ${status === 'correct' ? 'text-emerald-600' : 'text-gray-300'}`}>{q.marksAwarded || 0}</span>
                            <span className="text-gray-400 font-bold text-sm">/ {q.maxMarks} marks</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCQEvaluator;
