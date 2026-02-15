import { useState, useEffect } from 'react';
import {
    FiCode, FiFileText, FiCheckCircle, FiX, FiPlus, FiTrash2,
    FiPlay, FiEye, FiEyeOff, FiClock, FiCpu, FiAlertTriangle,
    FiChevronRight, FiTerminal, FiEdit, FiSave, FiArrowLeft
} from 'react-icons/fi';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';

const TABS = [
    { id: 'problem', label: 'Problem', icon: FiFileText },
    { id: 'io', label: 'I/O Format', icon: FiTerminal },
    { id: 'testcases', label: 'Test Cases', icon: FiPlay },
    { id: 'code', label: 'Code Template', icon: FiCode },
    { id: 'settings', label: 'Settings', icon: FiCpu },
];

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'python', label: 'Python', color: 'text-blue-600 bg-blue-50' },
    { value: 'java', label: 'Java', color: 'text-red-600 bg-red-50' },
    { value: 'cpp', label: 'C++', color: 'text-purple-600 bg-purple-50' },
    { value: 'c', label: 'C', color: 'text-gray-600 bg-gray-100' },
];

const CodingQuestionModal = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    editingQuestion,
    submitting,
    subjects = [],
    questionSets = [],
}) => {
    const [activeTab, setActiveTab] = useState('problem');
    const [errors, setErrors] = useState({});
    const [showPreviewPanel, setShowPreviewPanel] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('problem');
            setErrors({});
        }
    }, [isOpen]);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // ── Visible Test Cases ──
    const addVisibleTestCase = () => {
        setFormData(prev => ({
            ...prev,
            visibleTestCases: [...prev.visibleTestCases, { input: '', expectedOutput: '', explanation: '' }]
        }));
    };

    const removeVisibleTestCase = (idx) => {
        setFormData(prev => ({
            ...prev,
            visibleTestCases: prev.visibleTestCases.filter((_, i) => i !== idx)
        }));
    };

    const updateVisibleTestCase = (idx, field, value) => {
        setFormData(prev => {
            const updated = [...prev.visibleTestCases];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...prev, visibleTestCases: updated };
        });
    };

    // ── Hidden Test Cases ──
    const addHiddenTestCase = () => {
        setFormData(prev => ({
            ...prev,
            hiddenTestCases: [...prev.hiddenTestCases, { input: '', expectedOutput: '' }]
        }));
    };

    const removeHiddenTestCase = (idx) => {
        setFormData(prev => ({
            ...prev,
            hiddenTestCases: prev.hiddenTestCases.filter((_, i) => i !== idx)
        }));
    };

    const updateHiddenTestCase = (idx, field, value) => {
        setFormData(prev => {
            const updated = [...prev.hiddenTestCases];
            updated[idx] = { ...updated[idx], [field]: value };
            return { ...prev, hiddenTestCases: updated };
        });
    };

    // ── Validation ──
    const validate = () => {
        const err = {};
        if (!formData.questionText || formData.questionText.trim().length < 10) {
            err.questionText = 'Question must be at least 10 characters';
        }
        if (!formData.marks || formData.marks <= 0) err.marks = 'Marks must be > 0';
        if (!formData.programmingLanguage) err.programmingLanguage = 'Select a language';
        if (formData.visibleTestCases.length === 0) {
            err.visibleTestCases = 'Add at least one visible test case';
        } else {
            const invalid = formData.visibleTestCases.some(tc => !tc.input?.trim() || !tc.expectedOutput?.trim());
            if (invalid) err.visibleTestCases = 'All visible test cases need input & expected output';
        }
        if (formData.hiddenTestCases.length > 0) {
            const invalid = formData.hiddenTestCases.some(tc => !tc.input?.trim() || !tc.expectedOutput?.trim());
            if (invalid) err.hiddenTestCases = 'All hidden test cases need input & expected output';
        }
        if (formData.timeLimit && formData.timeLimit < 100) err.timeLimit = 'Min 100ms';
        if (formData.memoryLimit && formData.memoryLimit < 16) err.memoryLimit = 'Min 16MB';
        setErrors(err);
        
        // Jump to first tab with error
        if (err.questionText || err.marks) setActiveTab('problem');
        else if (err.visibleTestCases || err.hiddenTestCases) setActiveTab('testcases');
        else if (err.programmingLanguage) setActiveTab('settings');
        
        return Object.keys(err).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        onSubmit(e);
    };

    const totalTestCases = formData.visibleTestCases.length + formData.hiddenTestCases.length;
    const selectedLang = LANGUAGES.find(l => l.value === formData.programmingLanguage);

    // ── Tab Content Renderers ──

    const renderProblemTab = () => (
        <div className="space-y-5">
            {/* Question Text */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Problem Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={formData.questionText}
                    onChange={(e) => handleChange('questionText', e.target.value)}
                    placeholder="Write a function that takes an array of integers and returns the maximum sum subarray..."
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none ${errors.questionText ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
                />
                {errors.questionText && <p className="mt-1 text-xs text-red-600">{errors.questionText}</p>}
                <p className="mt-1 text-xs text-gray-400">{formData.questionText?.length || 0} characters</p>
            </div>

            {/* Explanation */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Explanation / Editorial (shown after exam)
                </label>
                <textarea
                    value={formData.explanation}
                    onChange={(e) => handleChange('explanation', e.target.value)}
                    placeholder="Explain the approach, time complexity, and solution strategy..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Difficulty</label>
                    <select
                        value={formData.difficulty}
                        onChange={(e) => handleChange('difficulty', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Marks <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        value={formData.marks}
                        onChange={(e) => handleChange('marks', e.target.value)}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none ${errors.marks ? 'border-red-400' : 'border-gray-200'}`}
                        min={1}
                    />
                    {errors.marks && <p className="mt-1 text-xs text-red-600">{errors.marks}</p>}
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Negative Marks</label>
                    <input
                        type="number"
                        value={formData.negativeMarks}
                        onChange={(e) => handleChange('negativeMarks', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        min={0}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Folder</label>
                    <select
                        value={formData.questionSet}
                        onChange={(e) => handleChange('questionSet', e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">Unassigned</option>
                        {questionSets.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Subject */}
            <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Academic Subject</label>
                <select
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-xs"
                >
                    <option value="">None</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
            </div>
        </div>
    );

    const renderIOTab = () => (
        <div className="space-y-6">
            {/* Input Format */}
            <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <FiArrowLeft className="w-4 h-4 rotate-180" />
                    </span>
                    Input Format
                </label>
                <textarea
                    value={formData.inputFormat}
                    onChange={(e) => handleChange('inputFormat', e.target.value)}
                    placeholder={`The first line contains an integer N — the number of elements.\nThe second line contains N space-separated integers.`}
                    rows={4}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white resize-none"
                />
            </div>

            {/* Output Format */}
            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <FiChevronRight className="w-4 h-4" />
                    </span>
                    Output Format
                </label>
                <textarea
                    value={formData.outputFormat}
                    onChange={(e) => handleChange('outputFormat', e.target.value)}
                    placeholder={`Print a single integer — the maximum sum of a contiguous subarray.`}
                    rows={4}
                    className="w-full px-4 py-3 border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none bg-white resize-none"
                />
            </div>

            {/* Constraints */}
            <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-xl">
                <label className="flex items-center gap-2 text-sm font-bold text-amber-900 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <FiAlertTriangle className="w-4 h-4" />
                    </span>
                    Constraints
                </label>
                <textarea
                    value={formData.constraints}
                    onChange={(e) => handleChange('constraints', e.target.value)}
                    placeholder={`1 ≤ N ≤ 10^5\n-10^9 ≤ A[i] ≤ 10^9\nTime Complexity: O(N)`}
                    rows={4}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white resize-none font-mono"
                />
            </div>

            {/* Sample I/O */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Sample Input / Output</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sample Input</label>
                        <textarea
                            value={formData.sampleInput}
                            onChange={(e) => handleChange('sampleInput', e.target.value)}
                            placeholder={`5\n-2 1 -3 4 -1 2 1 -5 4`}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-mono resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sample Output</label>
                        <textarea
                            value={formData.sampleOutput}
                            onChange={(e) => handleChange('sampleOutput', e.target.value)}
                            placeholder={`6`}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 font-mono resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTestCasesTab = () => (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border">
                <div className="flex items-center gap-2">
                    <FiPlay className="text-gray-500" />
                    <span className="text-sm font-bold text-gray-700">Total: {totalTestCases}</span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-1.5">
                    <FiEye className="text-green-600 w-4 h-4" />
                    <span className="text-sm text-green-700 font-medium">{formData.visibleTestCases.length} visible</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <FiEyeOff className="text-purple-600 w-4 h-4" />
                    <span className="text-sm text-purple-700 font-medium">{formData.hiddenTestCases.length} hidden</span>
                </div>
            </div>

            {/* Visible Test Cases */}
            <div className="rounded-xl border-2 border-green-200 overflow-hidden">
                <div className="bg-green-50 px-5 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-green-900 flex items-center gap-2">
                        <FiEye className="text-green-600" />
                        Visible Test Cases
                        <span className="text-xs font-normal text-green-600">(students can see these)</span>
                    </h3>
                    <button
                        type="button"
                        onClick={addVisibleTestCase}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <FiPlus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
                {errors.visibleTestCases && (
                    <div className="px-5 py-2 bg-red-50 text-red-600 text-xs font-medium border-b border-red-100">
                        {errors.visibleTestCases}
                    </div>
                )}
                <div className="p-4 space-y-4 bg-white">
                    {formData.visibleTestCases.map((tc, idx) => (
                        <div key={idx} className="relative group border border-green-200 rounded-xl p-4 bg-green-50/30 hover:bg-green-50/60 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-green-800 bg-green-100 px-2.5 py-1 rounded-full">
                                    Test Case #{idx + 1}
                                </span>
                                {formData.visibleTestCases.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeVisibleTestCase(idx)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Input</label>
                                    <textarea
                                        value={tc.input}
                                        onChange={(e) => updateVisibleTestCase(idx, 'input', e.target.value)}
                                        placeholder="Enter input..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-400 outline-none resize-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expected Output</label>
                                    <textarea
                                        value={tc.expectedOutput}
                                        onChange={(e) => updateVisibleTestCase(idx, 'expectedOutput', e.target.value)}
                                        placeholder="Enter expected output..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-400 outline-none resize-none bg-white"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Explanation (optional)</label>
                                <input
                                    type="text"
                                    value={tc.explanation || ''}
                                    onChange={(e) => updateVisibleTestCase(idx, 'explanation', e.target.value)}
                                    placeholder="Why does this input produce this output?"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                                />
                            </div>
                        </div>
                    ))}
                    {formData.visibleTestCases.length === 0 && (
                        <div className="text-center py-8">
                            <FiEye className="mx-auto mb-2 text-gray-300 w-8 h-8" />
                            <p className="text-sm text-gray-500">No visible test cases yet</p>
                            <button type="button" onClick={addVisibleTestCase} className="mt-2 text-green-600 text-sm font-bold hover:underline">
                                + Add your first test case
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Test Cases */}
            <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-5 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                        <FiEyeOff className="text-purple-600" />
                        Hidden Test Cases
                        <span className="text-xs font-normal text-purple-600">(for evaluation only — students cannot see)</span>
                    </h3>
                    <button
                        type="button"
                        onClick={addHiddenTestCase}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <FiPlus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
                {errors.hiddenTestCases && (
                    <div className="px-5 py-2 bg-red-50 text-red-600 text-xs font-medium border-b border-red-100">
                        {errors.hiddenTestCases}
                    </div>
                )}
                <div className="p-4 space-y-4 bg-white">
                    {formData.hiddenTestCases.map((tc, idx) => (
                        <div key={idx} className="relative group border border-purple-200 rounded-xl p-4 bg-purple-50/30 hover:bg-purple-50/60 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                    <FiEyeOff className="w-3 h-3" /> Hidden #{idx + 1}
                                </span>
                                {formData.hiddenTestCases.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeHiddenTestCase(idx)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Input</label>
                                    <textarea
                                        value={tc.input}
                                        onChange={(e) => updateHiddenTestCase(idx, 'input', e.target.value)}
                                        placeholder="Enter hidden input..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none resize-none bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expected Output</label>
                                    <textarea
                                        value={tc.expectedOutput}
                                        onChange={(e) => updateHiddenTestCase(idx, 'expectedOutput', e.target.value)}
                                        placeholder="Enter expected output..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none resize-none bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {formData.hiddenTestCases.length === 0 && (
                        <div className="text-center py-8">
                            <FiEyeOff className="mx-auto mb-2 text-gray-300 w-8 h-8" />
                            <p className="text-sm text-gray-500">No hidden test cases yet</p>
                            <button type="button" onClick={addHiddenTestCase} className="mt-2 text-purple-600 text-sm font-bold hover:underline">
                                + Add a hidden test case
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderCodeTab = () => (
        <div className="space-y-6">
            {/* Language Picker */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Programming Language</label>
                <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.value}
                            type="button"
                            onClick={() => handleChange('programmingLanguage', lang.value)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                formData.programmingLanguage === lang.value
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-200'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
                {errors.programmingLanguage && <p className="mt-1 text-xs text-red-600">{errors.programmingLanguage}</p>}
            </div>

            {/* Starter Code */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Starter Code Template
                    <span className="text-xs font-normal text-gray-400 ml-2">
                        (students will see this as the initial code)
                    </span>
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
                    <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <span className="text-xs text-gray-400 ml-2 font-mono">
                            {selectedLang?.label || 'Code'} — starter template
                        </span>
                    </div>
                    <textarea
                        value={formData.starterCode}
                        onChange={(e) => handleChange('starterCode', e.target.value)}
                        placeholder={getStarterPlaceholder(formData.programmingLanguage)}
                        rows={12}
                        className="w-full px-4 py-4 text-sm font-mono bg-gray-900 text-green-300 outline-none resize-none border-0"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Legacy code snippet (backward compat) */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Code Snippet / Boilerplate
                    <span className="text-xs font-normal text-gray-400 ml-2">(optional additional code)</span>
                </label>
                <textarea
                    value={formData.codeSnippet}
                    onChange={(e) => handleChange('codeSnippet', e.target.value)}
                    placeholder="Any additional boilerplate code..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 resize-none"
                />
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="space-y-6">
            {/* Execution Limits */}
            <div className="p-5 bg-gray-50 rounded-xl border">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiCpu className="text-indigo-500" /> Execution Limits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiClock className="text-amber-500" /> Time Limit
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={formData.timeLimit}
                                onChange={(e) => handleChange('timeLimit', e.target.value)}
                                className={`w-32 px-3 py-2.5 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${errors.timeLimit ? 'border-red-400' : 'border-gray-200'}`}
                                min={100}
                                step={100}
                            />
                            <span className="text-sm text-gray-500">milliseconds</span>
                        </div>
                        {errors.timeLimit && <p className="mt-1 text-xs text-red-600">{errors.timeLimit}</p>}
                        <div className="mt-2 flex gap-2">
                            {[500, 1000, 2000, 5000].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => handleChange('timeLimit', t)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                        Number(formData.timeLimit) === t
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                    }`}
                                >
                                    {t >= 1000 ? `${t / 1000}s` : `${t}ms`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiCpu className="text-blue-500" /> Memory Limit
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                value={formData.memoryLimit}
                                onChange={(e) => handleChange('memoryLimit', e.target.value)}
                                className={`w-32 px-3 py-2.5 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${errors.memoryLimit ? 'border-red-400' : 'border-gray-200'}`}
                                min={16}
                                step={16}
                            />
                            <span className="text-sm text-gray-500">MB</span>
                        </div>
                        {errors.memoryLimit && <p className="mt-1 text-xs text-red-600">{errors.memoryLimit}</p>}
                        <div className="mt-2 flex gap-2">
                            {[64, 128, 256, 512].map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleChange('memoryLimit', m)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                        Number(formData.memoryLimit) === m
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                    }`}
                                >
                                    {m}MB
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                <h3 className="font-bold text-indigo-900 mb-4">Question Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 bg-white rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">Language</p>
                        <p className="font-bold text-gray-800">{selectedLang?.label || '—'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">Difficulty</p>
                        <p className="font-bold text-gray-800 capitalize">{formData.difficulty}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">Total Tests</p>
                        <p className="font-bold text-gray-800">
                            {formData.visibleTestCases.length} visible + {formData.hiddenTestCases.length} hidden
                        </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border">
                        <p className="text-xs text-gray-500 mb-1">Marks</p>
                        <p className="font-bold text-gray-800">{formData.marks || '—'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const tabContent = {
        problem: renderProblemTab,
        io: renderIOTab,
        testcases: renderTestCasesTab,
        code: renderCodeTab,
        settings: renderSettingsTab,
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ minHeight: '70vh' }}>
                {/* Custom Header */}
                <div className="flex items-center justify-between pb-4 border-b mb-0 -mt-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <FiCode className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-gray-900">
                                {editingQuestion ? 'Edit Coding Question' : 'New Coding Question'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Configure all parameters for your coding problem
                            </p>
                        </div>
                    </div>
                    {selectedLang && (
                        <Badge variant="info" className="text-xs">
                            {selectedLang.label}
                        </Badge>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 py-3 border-b overflow-x-auto scrollbar-hide">
                    {TABS.map((tab, idx) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const hasError = tab.id === 'problem' && (errors.questionText || errors.marks)
                            || tab.id === 'testcases' && (errors.visibleTestCases || errors.hiddenTestCases)
                            || tab.id === 'settings' && (errors.programmingLanguage || errors.timeLimit || errors.memoryLimit);

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all relative ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : ''}`} />
                                {tab.label}
                                {hasError && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                                )}
                                {tab.id === 'testcases' && totalTestCases > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                        isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {totalTestCases}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 py-5 overflow-y-auto">
                    {tabContent[activeTab]?.()}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t bg-white sticky bottom-0">
                    <div className="flex items-center gap-3">
                        {/* Progress indicator */}
                        <div className="flex gap-1.5">
                            {TABS.map((tab) => (
                                <div
                                    key={tab.id}
                                    className={`h-1.5 w-8 rounded-full transition-colors ${
                                        activeTab === tab.id ? 'bg-indigo-500' : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-400 hidden md:block">
                            Step {TABS.findIndex(t => t.id === activeTab) + 1} of {TABS.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        {activeTab !== TABS[TABS.length - 1].id ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    const currentIdx = TABS.findIndex(t => t.id === activeTab);
                                    if (currentIdx < TABS.length - 1) {
                                        setActiveTab(TABS[currentIdx + 1].id);
                                    }
                                }}
                            >
                                Next <FiChevronRight className="ml-1" />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <Loader size="sm" />
                                ) : (
                                    <>
                                        <FiSave className="mr-2" />
                                        {editingQuestion ? 'Update Question' : 'Save to Bank'}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

// Helper: language-specific placeholder for starter code
function getStarterPlaceholder(lang) {
    switch (lang) {
        case 'python':
            return `def solution():\n    n = int(input())\n    arr = list(map(int, input().split()))\n    # Write your solution here\n    print(result)\n\nsolution()`;
        case 'java':
            return `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        // Write your solution here\n    }\n}`;
        case 'cpp':
            return `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Write your solution here\n    return 0;\n}`;
        case 'c':
            return `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Write your solution here\n    return 0;\n}`;
        default:
            return `function solution(input) {\n    const lines = input.split('\\n');\n    const n = parseInt(lines[0]);\n    // Write your solution here\n    return result;\n}\n\n// Read input\nconst input = require('fs').readFileSync('/dev/stdin', 'utf8');\nconsole.log(solution(input));`;
    }
}

export default CodingQuestionModal;
