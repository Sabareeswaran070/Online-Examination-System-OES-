import { useState } from 'react';
import {
    FiZap, FiCode, FiCpu, FiLoader, FiStar, FiRefreshCw,
    FiAlertTriangle, FiCheckCircle, FiChevronRight, FiSettings
} from 'react-icons/fi';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import { superAdminService } from '@/services';
import toast from 'react-hot-toast';

const DIFFICULTIES = [
    { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700 border-green-300', emoji: '🟢', desc: 'Basic concepts, loops, simple logic' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', emoji: '🟡', desc: 'Data structures, algorithms, patterns' },
    { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700 border-red-300', emoji: '🔴', desc: 'DP, graphs, complex optimization' },
];

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript', icon: '🟨' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'cpp', label: 'C++', icon: '⚡' },
    { value: 'c', label: 'C', icon: '🔧' },
];

const TOPIC_SUGGESTIONS = [
    'Two Sum Problem', 'Binary Search', 'Linked List Reversal', 'Stack Implementation',
    'BFS/DFS Traversal', 'Dynamic Programming - Fibonacci', 'Sorting Algorithm',
    'String Manipulation', 'Array Rotation', 'Matrix Operations',
    'Tree Traversal', 'Graph Shortest Path', 'Hash Map Operations',
    'Recursion & Backtracking', 'Sliding Window', 'Two Pointers',
    'Merge Intervals', 'Kadane\'s Algorithm', 'Palindrome Check',
    'Prime Number Sieve',
];

const AIGenerateModal = ({ isOpen, onClose, onGenerated }) => {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [language, setLanguage] = useState('javascript');
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [visibleCount, setVisibleCount] = useState(2);
    const [hiddenCount, setHiddenCount] = useState(3);
    const [generating, setGenerating] = useState(false);
    const [generatedQuestion, setGeneratedQuestion] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic or select one from suggestions');
            return;
        }
        setError('');
        setGenerating(true);
        setGeneratedQuestion(null);

        try {
            const response = await superAdminService.generateAICodingQuestion({
                topic: topic.trim(),
                difficulty,
                language,
                visibleTestCaseCount: Number(visibleCount) || 2,
                hiddenTestCaseCount: Number(hiddenCount) || 3,
                additionalInstructions: additionalInstructions.trim(),
            });

            if (response.success && response.data) {
                setGeneratedQuestion(response.data);
                toast.success('🎉 Coding question generated successfully!');
            } else {
                throw new Error(response.message || 'Generation failed');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to generate question';
            setError(msg);
            toast.error(`❌ ${msg}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleUseQuestion = () => {
        if (generatedQuestion) {
            onGenerated(generatedQuestion);
            handleClose();
        }
    };

    const handleRegenerate = () => {
        setGeneratedQuestion(null);
        handleGenerate();
    };

    const handleClose = () => {
        setTopic('');
        setDifficulty('medium');
        setLanguage('javascript');
        setAdditionalInstructions('');
        setVisibleCount(2);
        setHiddenCount(3);
        setGenerating(false);
        setGeneratedQuestion(null);
        setError('');
        setShowAdvanced(false);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title=""
            size="2xl"
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4 border-b border-gray-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200 mb-4">
                        <FiZap className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">AI Question Generator</h2>
                    <p className="text-gray-500 mt-1">Generate coding questions instantly with Google Gemini AI</p>
                </div>

                {!generatedQuestion ? (
                    <>
                        {/* Topic Input */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FiCode className="inline mr-1.5 text-violet-500" />
                                Topic / Concept <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => { setTopic(e.target.value); setError(''); }}
                                placeholder="e.g., Two Sum Problem, Binary Search Tree, Dynamic Programming..."
                                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 ${
                                    error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-violet-400 focus:bg-white'
                                }`}
                                onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerate()}
                                autoFocus
                            />
                            {error && (
                                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                    <FiAlertTriangle className="w-3.5 h-3.5" /> {error}
                                </p>
                            )}
                        </div>

                        {/* Quick Topic Suggestions */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                                Quick Suggestions
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                                {TOPIC_SUGGESTIONS.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setTopic(t); setError(''); }}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-150 hover:scale-105 ${
                                            topic === t
                                                ? 'bg-violet-100 text-violet-700 border-violet-300 font-medium'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FiStar className="inline mr-1.5 text-violet-500" />
                                Difficulty Level
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {DIFFICULTIES.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulty(d.value)}
                                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02] ${
                                            difficulty === d.value
                                                ? `${d.color} border-current shadow-sm`
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{d.emoji}</span>
                                            <span className="font-semibold text-sm">{d.label}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-tight">{d.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FiCpu className="inline mr-1.5 text-violet-500" />
                                Programming Language
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map((l) => (
                                    <button
                                        key={l.value}
                                        onClick={() => setLanguage(l.value)}
                                        className={`px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-2 hover:scale-105 ${
                                            language === l.value
                                                ? 'bg-violet-100 text-violet-700 border-violet-400 font-medium shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-violet-200'
                                        }`}
                                    >
                                        <span className="text-lg">{l.icon}</span>
                                        <span className="text-sm">{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Test Case Counts */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <FiCheckCircle className="inline mr-1.5 text-violet-500" />
                                Number of Test Cases
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-green-700">👁️ Visible</span>
                                        <span className="text-[10px] text-green-500 uppercase">Students can see</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setVisibleCount(n)}
                                                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${visibleCount === n ? 'bg-green-600 text-white shadow-md' : 'bg-white text-green-700 border border-green-300 hover:bg-green-100'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-purple-700">🔒 Hidden</span>
                                        <span className="text-[10px] text-purple-500 uppercase">For evaluation</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[2, 3, 4, 5, 6].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setHiddenCount(n)}
                                                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${hiddenCount === n ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <div>
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 transition-colors"
                            >
                                <FiSettings className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                                <span>Additional Instructions (Optional)</span>
                                <FiChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                            </button>
                            {showAdvanced && (
                                <textarea
                                    value={additionalInstructions}
                                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                                    placeholder="e.g., 'Focus on space optimization', 'Include edge cases for negative numbers', 'Make it competitive programming style'..."
                                    className="mt-2 w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 focus:bg-white transition-all resize-none"
                                    rows={3}
                                />
                            )}
                        </div>

                        {/* Generate Button */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                onClick={handleClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <button
                                onClick={handleGenerate}
                                disabled={generating || !topic.trim()}
                                className={`flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 ${
                                    generating || !topic.trim()
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-[1.02]'
                                }`}
                            >
                                {generating ? (
                                    <>
                                        <FiLoader className="w-5 h-5 animate-spin" />
                                        <span>Generating with AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiZap className="w-5 h-5" />
                                        <span>Generate Question</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Generating Animation */}
                        {generating && (
                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-100">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                                            <FiZap className="w-6 h-6 text-violet-600 animate-pulse" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-2 border-violet-300 border-t-transparent animate-spin"></div>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-violet-800">AI is crafting your question...</p>
                                        <p className="text-sm text-violet-600 mt-0.5">
                                            Generating problem statement, test cases, and starter code
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-4 gap-2">
                                    {['Problem', 'Test Cases', 'Code', 'Review'].map((step, i) => (
                                        <div key={step} className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                                                i === 0 ? 'bg-violet-600 text-white animate-pulse' : 'bg-violet-100 text-violet-400'
                                            }`}>
                                                {i + 1}
                                            </div>
                                            <span className="text-[10px] text-violet-500">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Preview Generated Question */
                    <GeneratedPreview
                        question={generatedQuestion}
                        onUse={handleUseQuestion}
                        onRegenerate={handleRegenerate}
                        onClose={handleClose}
                        generating={generating}
                    />
                )}
            </div>
        </Modal>
    );
};

/**
 * Preview component for the generated question
 */
const GeneratedPreview = ({ question, onUse, onRegenerate, onClose, generating }) => {
    const [previewTab, setPreviewTab] = useState('problem');

    const tabs = [
        { id: 'problem', label: 'Problem' },
        { id: 'testcases', label: 'Test Cases' },
        { id: 'code', label: 'Starter Code' },
    ];

    return (
        <div className="space-y-4">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <p className="font-semibold text-green-800">Question Generated Successfully!</p>
                    <p className="text-sm text-green-600">Review below and click "Use This Question" to edit & save it.</p>
                </div>
            </div>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    question.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                }`}>
                    {question.difficulty?.charAt(0).toUpperCase() + question.difficulty?.slice(1)}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {question.programmingLanguage}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    {question.marks} marks
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {question.visibleTestCases?.length || 0} visible + {question.hiddenTestCases?.length || 0} hidden test cases
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setPreviewTab(tab.id)}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                            previewTab === tab.id
                                ? 'bg-white text-violet-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-50 rounded-xl p-4 max-h-[40vh] overflow-y-auto border border-gray-200">
                {previewTab === 'problem' && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Problem Statement</h4>
                            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                                {question.questionText}
                            </div>
                        </div>
                        {question.inputFormat && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Input Format</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.inputFormat}</p>
                            </div>
                        )}
                        {question.outputFormat && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Output Format</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.outputFormat}</p>
                            </div>
                        )}
                        {question.constraints && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Constraints</h4>
                                <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">{question.constraints}</p>
                            </div>
                        )}
                        {question.explanation && (
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Editorial</h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.explanation}</p>
                            </div>
                        )}
                    </div>
                )}

                {previewTab === 'testcases' && (
                    <div className="space-y-4">
                        {question.visibleTestCases?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2">
                                    Visible Test Cases ({question.visibleTestCases.length})
                                </h4>
                                <div className="space-y-3">
                                    {question.visibleTestCases.map((tc, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-green-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                                    Case {i + 1}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Input</span>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 overflow-x-auto">{tc.input}</pre>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Output</span>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 overflow-x-auto">{tc.expectedOutput}</pre>
                                                </div>
                                            </div>
                                            {tc.explanation && (
                                                <p className="text-xs text-gray-500 mt-2 italic">💡 {tc.explanation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {question.hiddenTestCases?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">
                                    Hidden Test Cases ({question.hiddenTestCases.length})
                                </h4>
                                <div className="space-y-3">
                                    {question.hiddenTestCases.map((tc, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-purple-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                                    Hidden {i + 1}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Input</span>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 overflow-x-auto">{tc.input}</pre>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Output</span>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 text-gray-700 overflow-x-auto">{tc.expectedOutput}</pre>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {previewTab === 'code' && (
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Starter Code ({question.programmingLanguage})
                        </h4>
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono leading-relaxed">
                            {question.starterCode || 'No starter code generated'}
                        </pre>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                >
                    Discard
                </Button>
                <button
                    onClick={onRegenerate}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-violet-200 text-violet-700 font-medium hover:bg-violet-50 transition-all"
                >
                    <FiRefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                    Regenerate
                </button>
                <button
                    onClick={onUse}
                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                    <FiCheckCircle className="w-5 h-5" />
                    Use This Question
                </button>
            </div>
        </div>
    );
};

export default AIGenerateModal;
