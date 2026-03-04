import React, { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const getStatus = (q) => {
    const student = typeof q.studentAnswer === 'string' ? q.studentAnswer.toLowerCase() : String(q.studentAnswer);
    const correct = typeof q.correctAnswer === 'string' ? q.correctAnswer.toLowerCase() : String(q.correctAnswer);
    return student === correct ? 'correct' : 'wrong';
};

const STATUS = {
    correct: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Correct' },
    wrong: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Wrong' },
};

const TrueFalseEvaluator = ({ questions, activeQuestion, onSelectQuestion }) => {
    const [selected, setSelected] = useState(activeQuestion || questions[0] || null);
    const q = selected || questions[0];
    const handleSelect = (item) => { setSelected(item); onSelectQuestion(item); };

    if (!questions.length) return (
        <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm bg-gray-50">
            No True/False questions in this submission.
        </div>
    );

    const status = getStatus(q);
    const S = STATUS[status];

    const studentBool = q.studentAnswer === true || q.studentAnswer?.toLowerCase?.() === 'true';
    const correctBool = q.correctAnswer === true || q.correctAnswer?.toLowerCase?.() === 'true';

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Left */}
            <div className="w-72 flex-none border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">True / False Questions</p>
                    <div className="mt-2 flex gap-2">
                        {['correct', 'wrong'].map(s => {
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
                                <p className="text-xs text-gray-500 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.questionText}</p>
                                <span className={`mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS[st].badge}`}>{STATUS[st].label}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Right */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-8 flex items-start justify-center">
                <div className="max-w-xl w-full space-y-6">
                    {/* Q Header */}
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">Q{(questions.indexOf(q) + 1) || 1}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${S.badge}`}>{S.label}</span>
                    </div>

                    {/* Question */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <p className="text-gray-900 font-semibold text-lg leading-relaxed">{q.questionText}</p>
                    </div>

                    {/* T/F Cards */}
                    <div className="grid grid-cols-2 gap-5">
                        {[true, false].map(val => {
                            const label = val ? 'TRUE' : 'FALSE';
                            const isCorrect = correctBool === val;
                            const isStudent = studentBool === val;

                            let cls = 'bg-white border-gray-200 opacity-50';
                            if (isCorrect && isStudent) cls = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100 opacity-100';
                            else if (isStudent) cls = 'bg-red-50 border-red-400 ring-2 ring-red-100 opacity-100';
                            else if (isCorrect) cls = 'bg-emerald-50/60 border-emerald-200 opacity-100';

                            return (
                                <div key={label} className={`relative rounded-2xl border-2 p-8 flex flex-col items-center gap-3 transition-all ${cls}`}>
                                    {isStudent && (
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center shadow ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                            {isCorrect ? <FiCheck size={14} className="text-white" /> : <FiX size={14} className="text-white" />}
                                        </div>
                                    )}
                                    <span className="text-3xl">{val ? '✓' : '✗'}</span>
                                    <span className={`text-2xl font-black tracking-wider ${isCorrect ? 'text-emerald-700' : isStudent ? 'text-red-700' : 'text-gray-300'}`}>{label}</span>
                                    <div className="flex flex-col gap-1 items-center">
                                        {isStudent && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>Student's Answer</span>}
                                        {isCorrect && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">Correct Answer</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Result Banner */}
                    <div className={`rounded-xl border p-4 flex items-center gap-3 ${status === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <span className="text-xl">{status === 'correct' ? '🎯' : '❌'}</span>
                        <div>
                            <p className={`font-bold text-sm ${status === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>
                                {status === 'correct' ? `Correct! +${q.maxMarks} Mark${(q.maxMarks || 1) > 1 ? 's' : ''}` : 'Incorrect — 0 marks'}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Student answered <b>{studentBool ? 'TRUE' : 'FALSE'}</b>, correct is <b>{correctBool ? 'TRUE' : 'FALSE'}</b>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrueFalseEvaluator;
