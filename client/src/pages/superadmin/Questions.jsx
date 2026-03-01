import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiHelpCircle, FiSearch, FiCheck, FiX, FiCode, FiList, FiCheckCircle, FiFileText, FiFolder, FiChevronRight, FiGrid, FiArrowLeft, FiUpload, FiDownload, FiEye, FiEyeOff, FiClock, FiCpu, FiCopy, FiAlertTriangle } from 'react-icons/fi';
import Card from '@/components/common/Card.jsx';
import Button from '@/components/common/Button.jsx';
import Table from '@/components/common/Table.jsx';
import Modal from '@/components/common/Modal.jsx';
import Input from '@/components/common/Input.jsx';
import Select from '@/components/common/Select.jsx';
import Textarea from '@/components/common/Textarea.jsx';
import Loader from '@/components/common/Loader.jsx';
import Badge from '@/components/common/Badge.jsx';
import CodingQuestionModal from '@/components/superadmin/CodingQuestionModal.jsx';
import AIGenerateModal from '@/components/superadmin/AIGenerateModal.jsx';
import { superAdminService, facultyService } from '@/services';
import toast from 'react-hot-toast';

const AdminQuestions = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [questionSets, setQuestionSets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showCodingModal, setShowCodingModal] = useState(false);
    const [showCodingFormModal, setShowCodingFormModal] = useState(false);
    const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [codingPreviewTab, setCodingPreviewTab] = useState('problem');
    const [submitting, setSubmitting] = useState(false);

    // Folder View States
    const [viewMode, setViewMode] = useState('folders'); // 'folders' or 'questions'
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [folderType, setFolderType] = useState('set'); // 'subject' or 'set'

    const [folderData, setFolderData] = useState({ name: '', description: '' });

    const [formData, setFormData] = useState({
        questionText: '',
        type: 'MCQ',
        difficulty: 'medium',
        marks: 1,
        negativeMarks: 0,
        subject: '',
        questionSet: '',
        explanation: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        idealAnswer: '',
        programmingLanguage: 'javascript',
        codeSnippet: '',
        testCases: [{ input: '', expectedOutput: '' }],
        // Coding-specific fields
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        visibleTestCases: [{ input: '', expectedOutput: '', explanation: '' }],
        hiddenTestCases: [{ input: '', expectedOutput: '' }],
        timeLimit: 1000, // milliseconds
        memoryLimit: 256, // MB
        starterCode: '',
        sampleInput: '',
        sampleOutput: '',
        isGlobal: true,
    });

    const [filters, setFilters] = useState({
        type: '',
        difficulty: '',
        questionSet: '',
        search: '',
        status: '',
        isGlobal: '',
        subject: '',
        page: 1,
        limit: 20
    });
    const [selectedQuestions, setSelectedQuestions] = useState([]);

    const [totalQuestions, setTotalQuestions] = useState(0);
    const [totalQuestionPages, setTotalQuestionPages] = useState(1);

    // Question Set Pagination
    const [setPage, setSetPage] = useState(1);
    const [totalSetPages, setTotalSetPages] = useState(1);
    const [setsLoading, setSetsLoading] = useState(false);

    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    // Validation states
    const [formErrors, setFormErrors] = useState({});
    const [isValidating, setIsValidating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewQuestion, setPreviewQuestion] = useState(null);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        fetchQuestionSets();
    }, [setPage]);

    useEffect(() => {
        if (viewMode === 'questions') {
            fetchQuestions();
        }
    }, [filters, viewMode]);

    useEffect(() => {
        if (location.state?.preSelectSubject && subjects.length > 0) {
            const subjectId = location.state.preSelectSubject;
            const subject = subjects.find(s => s._id === subjectId);

            if (subject) {
                // Set filters to show questions for this subject
                setFilters(prev => ({
                    ...prev,
                    subject: subjectId,
                    page: 1,
                    type: '', // Clear other filters for clarity
                    status: '',
                    isGlobal: '',
                    search: ''
                }));
                setViewMode('questions');
                setSelectedFolder(subject);
                setFolderType('subject');

                // Open modal if requested
                if (location.state.openModal === 'AI') {
                    setShowAIGenerateModal(true);
                } else if (location.state.openModal === 'manual') {
                    resetForm();
                    setFormData(prev => ({ ...prev, subject: subjectId }));
                    setShowModal(true);
                }

                // Clear navigation state to prevent re-triggering
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, subjects]);

    const fetchSubjects = async () => {
        try {
            const subRes = await superAdminService.getSubjects();
            setSubjects(subRes.data || []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchQuestionSets = async () => {
        try {
            setSetsLoading(true);
            const response = await superAdminService.getQuestionSets({ page: setPage, limit: 12 });
            setQuestionSets(response.data || []);
            setTotalSetPages(response.totalPages || 1);
        } catch (error) {
            console.error('Error fetching question sets:', error);
        } finally {
            setSetsLoading(false);
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchSubjects(), fetchQuestionSets()]);
        } catch (error) {
            console.error('Error in initial fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await superAdminService.getQuestions(filters);
            setQuestions(response.data || []);
            setTotalQuestionPages(response.totalPages || 1);
            setTotalQuestions(response.count || 0);
        } catch (error) {
            toast.error('Failed to load questions');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFolderClick = (item, type) => {
        const isGlobal = item === 'global';
        setSelectedFolder(isGlobal ? { name: 'Global Library', _id: '' } : item);
        setFolderType(type);

        const newFilters = { ...filters, subject: '', questionSet: '', search: '', page: 1 };
        if (!isGlobal) {
            if (type === 'subject') newFilters.subject = item._id;
            else newFilters.questionSet = item._id;
        }

        setFilters(newFilters);
        setViewMode('questions');
    };

    const resetView = () => {
        setViewMode('folders');
        setSelectedFolder(null);
        setFilters({ ...filters, subject: '', questionSet: '', search: '', page: 1 });
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await superAdminService.createQuestionSet(folderData);
            setShowFolderModal(false);
            setFolderData({ name: '', description: '' });
            await fetchQuestionSets();
            toast.success('Folder created successfully');
        } catch (error) {
            toast.error('Failed to create folder');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteFolder = async (folderId, folderName) => {
        if (!window.confirm(`Delete folder "${folderName}"?\n\nAll questions in this folder will be moved to Unassigned.`)) return;
        try {
            await superAdminService.deleteQuestionSet(folderId);
            toast.success('Folder deleted successfully');
            await fetchQuestionSets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete folder');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const handleTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.testCases];
        newTestCases[index][field] = value;
        setFormData({ ...formData, testCases: newTestCases });
    };

    const addTestCase = () => {
        setFormData({
            ...formData,
            testCases: [...formData.testCases, { input: '', expectedOutput: '' }]
        });
    };

    const removeTestCase = (index) => {
        const newTestCases = formData.testCases.filter((_, i) => i !== index);
        setFormData({ ...formData, testCases: newTestCases });
    };

    // Visible Test Cases Management
    const addVisibleTestCase = () => {
        setFormData({
            ...formData,
            visibleTestCases: [...formData.visibleTestCases, { input: '', expectedOutput: '', explanation: '' }]
        });
    };

    const removeVisibleTestCase = (index) => {
        const newTestCases = formData.visibleTestCases.filter((_, i) => i !== index);
        setFormData({ ...formData, visibleTestCases: newTestCases });
    };

    const handleVisibleTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.visibleTestCases];
        newTestCases[index][field] = value;
        setFormData({ ...formData, visibleTestCases: newTestCases });
    };

    // Hidden Test Cases Management
    const addHiddenTestCase = () => {
        setFormData({
            ...formData,
            hiddenTestCases: [...formData.hiddenTestCases, { input: '', expectedOutput: '' }]
        });
    };

    const removeHiddenTestCase = (index) => {
        const newTestCases = formData.hiddenTestCases.filter((_, i) => i !== index);
        setFormData({ ...formData, hiddenTestCases: newTestCases });
    };

    const handleHiddenTestCaseChange = (index, field, value) => {
        const newTestCases = [...formData.hiddenTestCases];
        newTestCases[index][field] = value;
        setFormData({ ...formData, hiddenTestCases: newTestCases });
    };

    // Validation function
    const validateForm = () => {
        const errors = {};

        // Question text validation
        if (!formData.questionText || formData.questionText.trim().length < 10) {
            errors.questionText = 'Question text must be at least 10 characters';
        }

        // Marks validation
        if (!formData.marks || formData.marks <= 0) {
            errors.marks = 'Marks must be greater than 0';
        }

        // Negative marks validation
        if (formData.negativeMarks < 0) {
            errors.negativeMarks = 'Negative marks cannot be less than 0';
        }

        // Type-specific validation
        if (formData.type === 'MCQ') {
            // Check if all options are filled
            const emptyOptions = formData.options.filter(opt => !opt || opt.trim() === '');
            if (emptyOptions.length > 0) {
                errors.options = 'All 4 options must be filled';
            }

            // Check if correct answer is selected
            if (formData.correctAnswer === null || formData.correctAnswer === undefined) {
                errors.correctAnswer = 'Please select the correct answer';
            }
        }

        if (formData.type === 'TrueFalse') {
            if (!formData.correctAnswer) {
                errors.correctAnswer = 'Please select True or False';
            }
        }

        if (formData.type === 'Descriptive' && (!formData.idealAnswer || formData.idealAnswer.trim() === '')) {
            errors.idealAnswer = 'Ideal answer is required for descriptive questions';
        }

        if (formData.type === 'Coding') {
            if (!formData.programmingLanguage) {
                errors.programmingLanguage = 'Programming language is required';
            }

            // Validate visible test cases
            if (formData.visibleTestCases.length === 0) {
                errors.visibleTestCases = 'At least one visible test case is required';
            } else {
                const invalidVisibleTestCases = formData.visibleTestCases.filter(
                    tc => !tc.input || !tc.expectedOutput
                );
                if (invalidVisibleTestCases.length > 0) {
                    errors.visibleTestCases = 'All visible test cases must have input and expected output';
                }
            }

            // Validate hidden test cases
            if (formData.hiddenTestCases.length > 0) {
                const invalidHiddenTestCases = formData.hiddenTestCases.filter(
                    tc => !tc.input || !tc.expectedOutput
                );
                if (invalidHiddenTestCases.length > 0) {
                    errors.hiddenTestCases = 'All hidden test cases must have input and expected output';
                }
            }

            // Validate time and memory limits
            if (formData.timeLimit && formData.timeLimit < 100) {
                errors.timeLimit = 'Time limit should be at least 100ms';
            }
            if (formData.memoryLimit && formData.memoryLimit < 16) {
                errors.memoryLimit = 'Memory limit should be at least 16MB';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Check for duplicate questions
    const checkDuplicate = async (questionText) => {
        try {
            const response = await superAdminService.getQuestions({
                search: questionText,
                page: 1,
                limit: 5
            });

            const exactMatch = response.data?.find(
                q => q.questionText.toLowerCase().trim() === questionText.toLowerCase().trim()
            );

            return exactMatch;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setFormErrors({});

        // Validate form
        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        // Check for duplicates (only for new questions)
        if (!editingQuestion) {
            setIsValidating(true);
            const duplicate = await checkDuplicate(formData.questionText);
            setIsValidating(false);

            if (duplicate) {
                const proceed = window.confirm(
                    `A similar question already exists:\n\n"${duplicate.questionText}"\n\nDo you want to create this question anyway?`
                );
                if (!proceed) return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                marks: Number(formData.marks),
                negativeMarks: Number(formData.negativeMarks),
            };

            if (!payload.subject) delete payload.subject;
            if (!payload.questionSet) delete payload.questionSet;

            if (formData.type === 'MCQ') {
                payload.options = formData.options.map((text, idx) => ({
                    text,
                    isCorrect: idx === Number(formData.correctAnswer)
                }));
            } else if (formData.type === 'TrueFalse') {
                payload.options = [
                    { text: 'True', isCorrect: formData.correctAnswer === 'true' },
                    { text: 'False', isCorrect: formData.correctAnswer === 'false' }
                ];
            } else if (formData.type === 'Descriptive') {
                payload.correctAnswer = formData.idealAnswer;
            } else if (formData.type === 'Coding') {
                // Ensure numeric values for coding questions
                payload.timeLimit = Number(formData.timeLimit);
                payload.memoryLimit = Number(formData.memoryLimit);
            }

            if (editingQuestion) {
                await superAdminService.updateQuestion(editingQuestion._id, payload);
                toast.success('✅ Question updated successfully');
            } else {
                await superAdminService.createQuestion(payload);
                toast.success('✅ Question added to bank');
            }
            setShowModal(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            console.error('Submit error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save question';
            toast.error(`❌ ${errorMessage}`);

            // Show specific field errors if available
            if (error.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (q) => {
        setEditingQuestion(q);
        const data = {
            questionText: q.questionText,
            type: q.type,
            difficulty: q.difficulty,
            marks: q.marks,
            negativeMarks: q.negativeMarks || 0,
            subject: q.subject?._id || q.subject || '',
            questionSet: q.questionSet?._id || q.questionSet || '',
            explanation: q.explanation || '',
            options: q.options?.map(o => o.text) || ['', '', '', ''],
            correctAnswer: q.type === 'TrueFalse'
                ? (q.options?.find(o => o.isCorrect)?.text.toLowerCase() || 'true')
                : (q.options?.findIndex(o => o.isCorrect) ?? 0),
            idealAnswer: q.correctAnswer || '',
            programmingLanguage: q.programmingLanguage || 'javascript',
            codeSnippet: q.codeSnippet || '',
            testCases: q.testCases?.length ? q.testCases : [{ input: '', expectedOutput: '' }],
            inputFormat: q.inputFormat || '',
            outputFormat: q.outputFormat || '',
            constraints: q.constraints || '',
            visibleTestCases: q.visibleTestCases?.length ? q.visibleTestCases : [{ input: '', expectedOutput: '', explanation: '' }],
            hiddenTestCases: q.hiddenTestCases?.length ? q.hiddenTestCases : [{ input: '', expectedOutput: '' }],
            timeLimit: q.timeLimit || 1000,
            memoryLimit: q.memoryLimit || 256,
            starterCode: q.starterCode || '',
            sampleInput: q.sampleInput || '',
            sampleOutput: q.sampleOutput || '',
            isGlobal: q.isGlobal !== false,
        };
        setFormData(data);
        // Open dedicated coding modal for coding questions
        if (q.type === 'Coding') {
            setShowCodingFormModal(true);
        } else {
            setShowModal(true);
        }
    };

    // Open coding form for new question
    const handleNewCodingQuestion = () => {
        resetForm();
        setFormData(prev => ({ ...prev, type: 'Coding' }));
        setShowCodingFormModal(true);
    };

    // Handle coding form submission
    const handleCodingSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Only send coding-relevant fields (not MCQ options/correctAnswer etc.)
            const payload = {
                questionText: formData.questionText,
                type: 'Coding',
                difficulty: formData.difficulty,
                marks: Number(formData.marks),
                negativeMarks: Number(formData.negativeMarks),
                explanation: formData.explanation,
                programmingLanguage: formData.programmingLanguage,
                codeSnippet: formData.codeSnippet,
                starterCode: formData.starterCode,
                inputFormat: formData.inputFormat,
                outputFormat: formData.outputFormat,
                constraints: formData.constraints,
                sampleInput: formData.sampleInput,
                sampleOutput: formData.sampleOutput,
                timeLimit: Number(formData.timeLimit) || 1000,
                memoryLimit: Number(formData.memoryLimit) || 256,
                visibleTestCases: formData.visibleTestCases,
                hiddenTestCases: formData.hiddenTestCases,
                testCases: formData.testCases,
                isGlobal: formData.isGlobal,
            };

            // Only include ObjectId fields if they have a real value
            if (formData.subject) payload.subject = formData.subject;
            if (formData.questionSet) payload.questionSet = formData.questionSet;

            if (editingQuestion) {
                await superAdminService.updateQuestion(editingQuestion._id, payload);
                toast.success('Coding question updated successfully');
            } else {
                await superAdminService.createQuestion(payload);
                toast.success('Coding question added to bank');
            }
            setShowCodingFormModal(false);
            resetForm();
            fetchQuestions();
        } catch (error) {
            console.error('Coding submit error:', error);
            toast.error(error.response?.data?.message || 'Failed to save coding question');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle AI-generated question: populate form and open coding modal
    const handleAIGenerated = (aiQuestion) => {
        resetForm();
        setFormData(prev => ({
            ...prev,
            questionText: aiQuestion.questionText || '',
            type: 'Coding',
            difficulty: aiQuestion.difficulty || 'medium',
            marks: aiQuestion.marks || 10,
            negativeMarks: aiQuestion.negativeMarks || 0,
            options: aiQuestion.options?.length ? aiQuestion.options : ['', '', '', ''],
            correctAnswer: aiQuestion.correctAnswer || 0,
            isGlobal: aiQuestion.isGlobal !== false,
            explanation: aiQuestion.explanation || '',
            programmingLanguage: aiQuestion.programmingLanguage || 'javascript',
            codeSnippet: aiQuestion.codeSnippet || aiQuestion.starterCode || '',
            starterCode: aiQuestion.starterCode || '',
            inputFormat: aiQuestion.inputFormat || '',
            outputFormat: aiQuestion.outputFormat || '',
            constraints: aiQuestion.constraints || '',
            sampleInput: aiQuestion.sampleInput || '',
            sampleOutput: aiQuestion.sampleOutput || '',
            timeLimit: aiQuestion.timeLimit || 1000,
            memoryLimit: aiQuestion.memoryLimit || 256,
            visibleTestCases: aiQuestion.visibleTestCases?.length
                ? aiQuestion.visibleTestCases
                : [{ input: '', expectedOutput: '', explanation: '' }],
            hiddenTestCases: aiQuestion.hiddenTestCases?.length
                ? aiQuestion.hiddenTestCases
                : [{ input: '', expectedOutput: '' }],
            testCases: aiQuestion.testCases?.length
                ? aiQuestion.testCases
                : [{ input: '', expectedOutput: '' }],
        }));
        setEditingQuestion(null);
        setShowAIGenerateModal(false);
        setShowCodingFormModal(true);
    };

    const handleDelete = async (id) => {
        const question = questions.find(q => q._id === id);
        if (!question) return;

        const confirmMessage = `⚠️ Delete this question permanently?\n\n"${question.questionText.substring(0, 100)}${question.questionText.length > 100 ? '...' : ''}"\n\nType: ${question.type} | Difficulty: ${question.difficulty} | Marks: ${question.marks}\n\nThis action cannot be undone.`;

        if (!window.confirm(confirmMessage)) return;

        try {
            await superAdminService.deleteQuestion(id);
            toast.success('✅ Question deleted successfully');
            fetchQuestions();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(`❌ ${error.response?.data?.message || 'Failed to delete question'}`);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions? This action cannot be undone.`)) return;
        try {
            setLoading(true);
            const res = await facultyService.bulkDeleteQuestions(selectedQuestions);
            toast.success(res.message || 'Selected questions deleted successfully');
            setSelectedQuestions([]);
            fetchQuestions();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete selected questions');
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            setLoading(true);
            await superAdminService.updateQuestionStatus(id, status);
            toast.success(`Question ${status} successfully`);
            fetchQuestions();
        } catch (error) {
            console.error('Status update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    // Preview question function
    const handlePreview = (question) => {
        setPreviewQuestion(question);
        // Open special modal for coding questions
        if (question.type === 'Coding') {
            setShowCodingModal(true);
        } else {
            setShowPreview(true);
        }
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['.csv', 'text/csv', 'application/vnd.ms-excel'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension !== 'csv' && !validTypes.includes(file.type)) {
            toast.error('❌ Invalid file type. Please upload a CSV file.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('❌ File size exceeds 5MB limit');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', file);
        if (selectedFolder && selectedFolder._id) {
            if (folderType === 'subject') uploadData.append('subjectId', selectedFolder._id);
            else uploadData.append('questionSetId', selectedFolder._id);
        }

        try {
            setUploading(true);
            toast.loading('Uploading questions...', { id: 'bulk-upload' });

            const res = await superAdminService.bulkUploadQuestions(uploadData);

            toast.dismiss('bulk-upload');

            // Show detailed results
            const successCount = res.successCount || res.data?.length || 0;
            const failureCount = res.failureCount || 0;
            const totalRows = res.totalRows || successCount + failureCount;

            if (failureCount > 0) {
                toast.success(
                    `✅ Uploaded ${successCount}/${totalRows} questions\n❌ ${failureCount} failed`,
                    { duration: 5000 }
                );

                // Log errors for debugging
                if (res.errors && res.errors.length > 0) {
                    console.log('Upload errors:', res.errors);
                    toast.error(
                        `First error: Row ${res.errors[0].row}: ${res.errors[0].error}`,
                        { duration: 5000 }
                    );
                }
            } else {
                toast.success(`✅ Successfully uploaded ${successCount} questions!`);
            }

            if (viewMode === 'questions') await fetchQuestions();
            else await fetchInitialData();
        } catch (error) {
            console.error('Upload error:', error);
            toast.dismiss('bulk-upload');
            toast.error(`❌ ${error.response?.data?.message || 'Bulk upload failed'}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ["questionText", "type", "marks", "difficulty", "correctAnswerIndex", "option1", "option2", "option3", "option4", "explanation"];
        const example = ["What is the capital of France?", "MCQ", "1", "easy", "0", "Paris", "London", "Berlin", "Madrid", "Paris is the capital."];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + example.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "question_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetForm = () => {
        setFormData({
            questionText: '',
            type: 'MCQ',
            difficulty: 'medium',
            marks: 1,
            negativeMarks: 0,
            subject: folderType === 'subject' ? (selectedFolder?._id || '') : '',
            questionSet: folderType === 'set' ? (selectedFolder?._id || '') : '',
            explanation: '',
            options: ['', '', '', ''],
            correctAnswer: 0,
            isGlobal: true,
            idealAnswer: '',
            programmingLanguage: 'javascript',
            codeSnippet: '',
            testCases: [{ input: '', expectedOutput: '' }],
            // Enhanced coding fields
            inputFormat: '',
            outputFormat: '',
            constraints: '',
            visibleTestCases: [{ input: '', expectedOutput: '', explanation: '' }],
            hiddenTestCases: [{ input: '', expectedOutput: '' }],
            timeLimit: 1000,
            memoryLimit: 256,
            starterCode: '',
            sampleInput: '',
            sampleOutput: '',
        });
        setEditingQuestion(null);
        setFormErrors({});
    };

    const getDifficultyBadge = (d) => {
        const variants = { easy: 'success', medium: 'warning', hard: 'danger' };
        return <Badge variant={variants[d] || 'neutral'}>{d.toUpperCase()}</Badge>;
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'MCQ': return <FiList className="text-blue-500" />;
            case 'Coding': return <FiCode className="text-purple-500" />;
            case 'TrueFalse': return <FiCheckCircle className="text-green-500" />;
            default: return <FiFileText className="text-gray-500" />;
        }
    };

    const columns = [
        {
            header: 'Question',
            render: (row) => (
                <div className="flex items-start gap-3">
                    <div className="mt-1">{getTypeIcon(row.type)}</div>
                    <div className="max-w-xs lg:max-w-md">
                        <p className="font-medium text-gray-900 truncate" title={row.questionText}>{row.questionText}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {row.questionSet?.name ? `📁 ${row.questionSet.name}` : (row.subject?.name || 'Global Library')}
                        </p>
                    </div>
                </div>
            )
        },
        { header: 'Type', accessor: 'type' },
        {
            header: 'Visibility',
            render: (row) => (
                <Badge variant={row.isGlobal ? 'info' : 'secondary'}>
                    {row.isGlobal ? 'GLOBAL' : 'LOCAL'}
                </Badge>
            )
        },
        { header: 'Difficulty', render: (row) => getDifficultyBadge(row.difficulty) },
        { header: 'Marks', render: (row) => <span className="font-semibold">{row.marks}</span> },
        {
            header: 'Status',
            render: (row) => (
                <Badge variant={
                    row.status === 'approved' ? 'success' :
                        row.status === 'rejected' ? 'danger' : 'warning'
                }>
                    {row.status?.toUpperCase() || 'APPROVED'}
                </Badge>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex gap-2">
                    {row.status === 'pending' && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate(row._id, 'approved')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve Question"
                            >
                                <FiCheckCircle className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(row._id, 'rejected')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject Question"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => handlePreview(row)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Preview Question"
                    >
                        <FiHelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(row)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <FiEdit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Library Manager</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="hover:text-primary-600 cursor-pointer transition-colors" onClick={resetView}>Question Bank</span>
                        {selectedFolder && (
                            <>
                                <FiChevronRight className="text-gray-300" />
                                <span className="text-gray-900 font-medium">{selectedFolder.name}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleBulkUpload}
                        className="hidden"
                        accept=".csv"
                    />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 sm:flex-none border-primary-200 hover:border-primary-500"
                        loading={uploading}
                    >
                        <FiUpload className="mr-2" /> Bulk Import
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleDownloadTemplate}
                        className="flex-1 sm:flex-none border-gray-200"
                    >
                        <FiDownload className="mr-2" /> Template
                    </Button>
                    <Button variant="secondary" onClick={() => setShowFolderModal(true)} className="flex-1 sm:flex-none hidden md:flex">
                        <FiPlus className="mr-2" /> New Folder
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleNewCodingQuestion}
                        className="flex-1 sm:flex-none border-purple-200 hover:border-purple-500 text-purple-700"
                    >
                        <FiCode className="mr-2" /> Coding Q
                    </Button>
                    <button
                        onClick={() => setShowAIGenerateModal(true)}
                        className="flex-1 sm:flex-none flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200 hover:shadow-lg transition-all duration-200 hover:scale-105 text-sm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        AI Generate
                    </button>
                    <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex-1 sm:flex-none shadow-lg shadow-primary-100">
                        <FiPlus className="mr-2" /> Add Question
                    </Button>
                </div>
            </div>

            {/* Folder View vs Question List */}
            {viewMode === 'folders' ? (
                <div className="space-y-8">
                    {/* Manual Question Sets */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <FiFolder className="text-primary-500" /> Custom Folders
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {/* Global Folder */}
                            <div
                                onClick={() => handleFolderClick('global', 'set')}
                                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-2 border-transparent hover:border-primary-500 hover:shadow-xl hover:shadow-primary-50 transition-all cursor-pointer"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                                    <FiFolder className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
                                </div>
                                <span className="text-sm font-bold text-gray-700 group-hover:text-primary-700">Unassigned</span>
                            </div>

                            {/* Question Set Folders */}
                            {questionSets.map((set) => (
                                <div
                                    key={set._id}
                                    className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border-2 border-transparent hover:border-primary-500 hover:shadow-xl hover:shadow-primary-50 transition-all cursor-pointer"
                                    onClick={() => handleFolderClick(set, 'set')}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(set._id, set.name);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-10"
                                        title="Delete folder"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                                        <FiFolder className="w-8 h-8 text-primary-500" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-primary-700 text-center line-clamp-2">{set.name}</span>
                                </div>
                            ))}
                        </div>
                        {totalSetPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => setSetPage(p => Math.max(1, p - 1))}
                                    disabled={setPage === 1}
                                    className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    <FiArrowLeft />
                                </button>
                                <span className="text-sm text-gray-600 font-medium">Page {setPage} of {totalSetPages}</span>
                                <button
                                    onClick={() => setSetPage(p => Math.min(totalSetPages, p + 1))}
                                    disabled={setPage === totalSetPages}
                                    className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    <FiChevronRight />
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Academic Subjects */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <FiGrid className="text-purple-500" /> Academic Subjects
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                            {subjects.map((sub) => (
                                <div
                                    key={sub._id}
                                    onClick={() => handleFolderClick(sub, 'subject')}
                                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-purple-500 transition-all cursor-pointer"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center group-hover:bg-purple-50 transition-colors shadow-sm">
                                        <FiFolder className="w-8 h-8 text-purple-400 group-hover:text-purple-600" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-purple-700 text-center line-clamp-2">{sub.name}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            ) : (
                <Card className="border-none shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button onClick={resetView} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all text-gray-500">
                                <FiArrowLeft />
                            </button>
                            <div className="relative flex-1 md:w-80">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search in folder..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <select
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                value={filters.limit}
                                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                            >
                                {[20, 50, 100, 500].map(size => (
                                    <option key={size} value={size}>{size} per page</option>
                                ))}
                            </select>
                            <Select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'MCQ', label: 'MCQ' },
                                    { value: 'Coding', label: 'Coding' },
                                    { value: 'Descriptive', label: 'Descriptive' },
                                    { value: 'TrueFalse', label: 'T/F' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                            <Select
                                value={filters.isGlobal}
                                onChange={(e) => setFilters({ ...filters, isGlobal: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'Visibility' },
                                    { value: 'true', label: 'Global' },
                                    { value: 'false', label: 'Local' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                            <Select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'rejected', label: 'Rejected' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                            <Select
                                value={filters.difficulty}
                                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
                                options={[
                                    { value: '', label: 'Difficulty' },
                                    { value: 'easy', label: 'Easy' },
                                    { value: 'medium', label: 'Medium' },
                                    { value: 'hard', label: 'Hard' },
                                ]}
                                className="bg-white min-w-[120px]"
                            />
                        </div>
                    </div>

                    {selectedQuestions.length > 0 && (
                        <div className="bg-emerald-50 p-4 mx-4 rounded-xl border border-emerald-100 flex items-center justify-between animate-fade-in text-emerald-900 font-bold text-sm mb-4 mt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                                    {selectedQuestions.length}
                                </div>
                                <div>
                                    <p>Questions Selected</p>
                                    <p className="text-emerald-700 text-xs font-normal">Bulk actions available for selected items</p>
                                </div>
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="shadow-md hover:scale-105 transition-all"
                            >
                                <FiTrash2 className="w-4 h-4 mr-2" />
                                Delete Selected
                            </Button>
                        </div>
                    )}

                    {loading && questions.length === 0 ? (
                        <div className="py-20 flex justify-center"><Loader /></div>
                    ) : questions.length > 0 ? (
                        <>
                            <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                                <Table
                                    columns={columns}
                                    data={questions}
                                    selectable={true}
                                    selectedRows={selectedQuestions}
                                    onSelectChange={setSelectedQuestions}
                                />
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100 gap-4">
                                <div className="text-sm text-gray-600 font-medium">
                                    Displaying <span className="text-gray-900 font-bold">{(filters.page - 1) * filters.limit + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(filters.page * filters.limit, totalQuestions)}</span> of <span className="text-gray-900 font-bold">{totalQuestions}</span> questions
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                                        disabled={filters.page === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Prev
                                    </button>

                                    <div className="flex gap-1">
                                        {[...Array(Math.min(5, totalQuestionPages))].map((_, i) => {
                                            let pageNum;
                                            if (totalQuestionPages <= 5) pageNum = i + 1;
                                            else if (filters.page <= 3) pageNum = i + 1;
                                            else if (filters.page >= totalQuestionPages - 2) pageNum = totalQuestionPages - 4 + i;
                                            else pageNum = filters.page - 2 + i;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setFilters({ ...filters, page: pageNum })}
                                                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-all ${filters.page === pageNum
                                                        ? 'bg-primary-600 text-white shadow-md'
                                                        : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setFilters({ ...filters, page: Math.min(totalQuestionPages, filters.page + 1) })}
                                        disabled={filters.page === totalQuestionPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiHelpCircle className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Empty folder</h3>
                            <p className="text-gray-500">No questions match your current filters in this category.</p>
                            <Button variant="secondary" onClick={() => { resetForm(); setShowModal(true); }} className="mt-4">
                                Add First Question
                            </Button>
                        </div>
                    )}
                </Card>
            )}

            {/* Folder Creation Modal */}
            <Modal
                isOpen={showFolderModal}
                onClose={() => setShowFolderModal(false)}
                title="Create New Folder"
                size="md"
            >
                <form onSubmit={handleCreateFolder} className="space-y-4">
                    <Input
                        label="Folder Name"
                        placeholder="e.g., Coding Challenge Set A"
                        value={folderData.name}
                        onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
                        required
                    />
                    <Textarea
                        label="Description (Optional)"
                        placeholder="Purpose of this folder..."
                        value={folderData.description}
                        onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setShowFolderModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <Loader size="sm" /> : 'Create Folder'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Question Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editingQuestion ? 'Edit Question' : 'Add New Question'}
                size="2xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Type"
                            name="type"
                            value={formData.type}
                            onChange={(e) => {
                                const newType = e.target.value;
                                if (newType === 'Coding') {
                                    // Switch to dedicated coding modal
                                    setShowModal(false);
                                    setFormData(prev => ({ ...prev, type: 'Coding' }));
                                    setTimeout(() => setShowCodingFormModal(true), 150);
                                } else {
                                    setFormData({ ...formData, type: newType, correctAnswer: newType === 'TrueFalse' ? 'true' : 0 });
                                }
                            }}
                            options={[
                                { value: 'MCQ', label: 'MCQ' },
                                { value: 'TrueFalse', label: 'True/False' },
                                { value: 'Descriptive', label: 'Descriptive' },
                                { value: 'Coding', label: 'Coding' },
                            ]}
                            required
                        />
                        <Select
                            label="Folder (Set)"
                            name="questionSet"
                            value={formData.questionSet}
                            onChange={handleChange}
                            options={[
                                { value: '', label: 'Unassigned' },
                                ...questionSets.map(s => ({ value: s._id, label: s.name }))
                            ]}
                        />
                        <Select
                            label="Academic Subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            options={[
                                { value: '', label: 'None' },
                                ...subjects.map(s => ({ value: s._id, label: s.name }))
                            ]}
                        />
                    </div>

                    <Textarea
                        label="Question Text"
                        name="questionText"
                        value={formData.questionText}
                        onChange={handleChange}
                        placeholder="Type your question here..."
                        rows={4}
                        required
                    />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Select
                            label="Difficulty"
                            name="difficulty"
                            value={formData.difficulty}
                            onChange={handleChange}
                            options={[
                                { value: 'easy', label: 'Easy' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'hard', label: 'Hard' },
                            ]}
                            required
                        />
                        <Input
                            label="Marks"
                            name="marks"
                            type="number"
                            value={formData.marks}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Negative Marks"
                            name="negativeMarks"
                            type="number"
                            value={formData.negativeMarks}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Type Specific Fields */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {formData.type === 'MCQ' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Options & Correct Answer</label>
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <input
                                            type="radio"
                                            name="correctAnswer"
                                            checked={Number(formData.correctAnswer) === idx}
                                            onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                                            className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                        />
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Option ${idx + 1}`}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {formData.type === 'TrueFalse' && (
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Select Correct Statement</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.correctAnswer === 'true'}
                                            onChange={() => setFormData({ ...formData, correctAnswer: 'true' })}
                                        /> True
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.correctAnswer === 'false'}
                                            onChange={() => setFormData({ ...formData, correctAnswer: 'false' })}
                                        /> False
                                    </label>
                                </div>
                            </div>
                        )}

                        {formData.type === 'Descriptive' && (
                            <div className="space-y-4">
                                <Textarea
                                    label="Ideal/Sample Answer (for grading reference)"
                                    name="idealAnswer"
                                    value={formData.idealAnswer}
                                    onChange={handleChange}
                                    placeholder="Explain how this question should be answered..."
                                    rows={3}
                                />
                            </div>
                        )}

                        {formData.type === 'Coding' && (
                            <div className="space-y-5">
                                {/* Language and Limits */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Select
                                        label="Language"
                                        name="programmingLanguage"
                                        value={formData.programmingLanguage}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'javascript', label: 'JavaScript' },
                                            { value: 'python', label: 'Python' },
                                            { value: 'java', label: 'Java' },
                                            { value: 'cpp', label: 'C++' },
                                            { value: 'c', label: 'C' },
                                        ]}
                                    />
                                    <Input
                                        label="Time Limit (ms)"
                                        name="timeLimit"
                                        type="number"
                                        value={formData.timeLimit}
                                        onChange={handleChange}
                                        placeholder="1000"
                                    />
                                    <Input
                                        label="Memory Limit (MB)"
                                        name="memoryLimit"
                                        type="number"
                                        value={formData.memoryLimit}
                                        onChange={handleChange}
                                        placeholder="256"
                                    />
                                </div>

                                {/* Input/Output Format */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Textarea
                                        label="Input Format"
                                        name="inputFormat"
                                        value={formData.inputFormat}
                                        onChange={handleChange}
                                        placeholder="Describe the input format..."
                                        rows={3}
                                    />
                                    <Textarea
                                        label="Output Format"
                                        name="outputFormat"
                                        value={formData.outputFormat}
                                        onChange={handleChange}
                                        placeholder="Describe the expected output format..."
                                        rows={3}
                                    />
                                </div>

                                {/* Constraints */}
                                <Textarea
                                    label="Constraints"
                                    name="constraints"
                                    value={formData.constraints}
                                    onChange={handleChange}
                                    placeholder="e.g., 1 ≤ n ≤ 10^5, Time: O(n log n)"
                                    rows={2}
                                />

                                {/* Starter Code */}
                                <Textarea
                                    label="Starter Code Template"
                                    name="starterCode"
                                    value={formData.starterCode}
                                    onChange={handleChange}
                                    placeholder="function solution(input) {\n    // Write your code here\n    return result;\n}"
                                    rows={5}
                                    className="font-mono text-sm"
                                />

                                {/* Sample Input/Output */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Textarea
                                        label="Sample Input"
                                        name="sampleInput"
                                        value={formData.sampleInput}
                                        onChange={handleChange}
                                        placeholder="Example input..."
                                        rows={3}
                                        className="font-mono text-sm"
                                    />
                                    <Textarea
                                        label="Sample Output"
                                        name="sampleOutput"
                                        value={formData.sampleOutput}
                                        onChange={handleChange}
                                        placeholder="Expected output..."
                                        rows={3}
                                        className="font-mono text-sm"
                                    />
                                </div>

                                {/* Visible Test Cases */}
                                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-green-900 flex items-center gap-2">
                                            <FiCheckCircle /> Visible Test Cases (Students can see)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addVisibleTestCase}
                                            className="text-xs text-green-700 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <FiPlus /> Add Visible Test Case
                                        </button>
                                    </div>
                                    {formData.visibleTestCases.map((tc, idx) => (
                                        <div key={idx} className="grid grid-cols-1 gap-2 p-3 bg-white rounded-xl border border-green-300 relative">
                                            {formData.visibleTestCases.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeVisibleTestCase(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
                                                    title="Remove test case"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            )}
                                            <div className="text-xs font-bold text-gray-600">Test Case {idx + 1}</div>
                                            <input
                                                placeholder="Input"
                                                className="px-3 py-2 text-sm border rounded-lg outline-none focus:border-green-500 font-mono"
                                                value={tc.input}
                                                onChange={(e) => handleVisibleTestCaseChange(idx, 'input', e.target.value)}
                                            />
                                            <input
                                                placeholder="Expected Output"
                                                className="px-3 py-2 text-sm border rounded-lg outline-none focus:border-green-500 font-mono"
                                                value={tc.expectedOutput}
                                                onChange={(e) => handleVisibleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                                            />
                                            <input
                                                placeholder="Explanation (optional)"
                                                className="px-3 py-2 text-sm border rounded-lg outline-none focus:border-green-500"
                                                value={tc.explanation || ''}
                                                onChange={(e) => handleVisibleTestCaseChange(idx, 'explanation', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Hidden Test Cases */}
                                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                            <FiX /> Hidden Test Cases (For evaluation only)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addHiddenTestCase}
                                            className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <FiPlus /> Add Hidden Test Case
                                        </button>
                                    </div>
                                    {formData.hiddenTestCases.map((tc, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-purple-300 relative">
                                            {formData.hiddenTestCases.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeHiddenTestCase(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
                                                    title="Remove test case"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            )}
                                            <input
                                                placeholder={`Hidden Input ${idx + 1}`}
                                                className="px-3 py-2 text-sm border rounded-lg outline-none focus:border-purple-500 font-mono"
                                                value={tc.input}
                                                onChange={(e) => handleHiddenTestCaseChange(idx, 'input', e.target.value)}
                                            />
                                            <input
                                                placeholder={`Hidden Output ${idx + 1}`}
                                                className="px-3 py-2 text-sm border rounded-lg outline-none focus:border-purple-500 font-mono"
                                                value={tc.expectedOutput}
                                                onChange={(e) => handleHiddenTestCaseChange(idx, 'expectedOutput', e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <Textarea
                        label="Explanation for Students"
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleChange}
                        placeholder="Help students understand the answer after the exam..."
                        rows={2}
                        required
                    />

                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                name="isGlobal"
                                checked={formData.isGlobal}
                                onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 transition-all"
                            />
                            <div>
                                <span className="block text-sm font-bold text-blue-900 group-hover:text-blue-700">Make Global</span>
                                <span className="block text-[11px] text-blue-700 opacity-80 mt-0.5">Global questions are visible to all colleges and can be used in global exams.</span>
                            </div>
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                        <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? <Loader size="sm" /> : editingQuestion ? 'Update Question' : 'Save to Bank'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Question Preview Modal */}
            <Modal
                isOpen={showPreview}
                onClose={() => {
                    setShowPreview(false);
                    setPreviewQuestion(null);
                }}
                title="Question Preview"
            >
                {previewQuestion && (
                    <div className="space-y-4">
                        {/* Question Text */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {previewQuestion.questionText}
                            </h3>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={
                                previewQuestion.type === 'MCQ' ? 'primary' :
                                    previewQuestion.type === 'TrueFalse' ? 'success' :
                                        previewQuestion.type === 'Descriptive' ? 'warning' : 'info'
                            }>
                                {previewQuestion.type}
                            </Badge>
                            {getDifficultyBadge(previewQuestion.difficulty)}
                            <Badge variant="secondary">
                                {previewQuestion.marks} {previewQuestion.marks === 1 ? 'Mark' : 'Marks'}
                            </Badge>
                            {previewQuestion.negativeMarks > 0 && (
                                <Badge variant="danger">
                                    -{previewQuestion.negativeMarks} Negative
                                </Badge>
                            )}
                        </div>

                        {/* Subject/Folder */}
                        {(previewQuestion.subject || previewQuestion.questionSet) && (
                            <div className="text-sm text-gray-600">
                                <strong>Category:</strong> {previewQuestion.questionSet?.name || previewQuestion.subject?.name || 'Global Library'}
                            </div>
                        )}

                        {/* Options for MCQ/TrueFalse */}
                        {(previewQuestion.type === 'MCQ' || previewQuestion.type === 'TrueFalse') && previewQuestion.options && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Options:</h4>
                                <div className="space-y-2">
                                    {previewQuestion.options.map((option, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border-2 ${option.isCorrect
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-gray-50 border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {option.isCorrect && (
                                                    <FiCheckCircle className="text-green-600 flex-shrink-0" />
                                                )}
                                                <span className={option.isCorrect ? 'font-semibold text-green-900' : 'text-gray-700'}>
                                                    {String.fromCharCode(65 + idx)}. {option.text}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ideal Answer for Descriptive */}
                        {previewQuestion.type === 'Descriptive' && previewQuestion.correctAnswer && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Ideal Answer:</h4>
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-gray-800">{previewQuestion.correctAnswer}</p>
                                </div>
                            </div>
                        )}

                        {/* Explanation */}
                        {previewQuestion.explanation && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Explanation:</h4>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-gray-800">{previewQuestion.explanation}</p>
                                </div>
                            </div>
                        )}

                        {/* Code Snippet for Coding Questions */}
                        {previewQuestion.type === 'Coding' && previewQuestion.codeSnippet && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Code Snippet:</h4>
                                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                                    <code>{previewQuestion.codeSnippet}</code>
                                </pre>
                            </div>
                        )}

                        {/* Test Cases for Coding Questions */}
                        {previewQuestion.type === 'Coding' && previewQuestion.testCases && previewQuestion.testCases.length > 0 && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Test Cases:</h4>
                                <div className="space-y-2">
                                    {previewQuestion.testCases.map((tc, idx) => (
                                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="font-medium">Input:</span> {tc.input}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Output:</span> {tc.expectedOutput}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Coding Question Create/Edit Modal */}
            <CodingQuestionModal
                isOpen={showCodingFormModal}
                onClose={() => { setShowCodingFormModal(false); resetForm(); }}
                onSubmit={handleCodingSubmit}
                formData={formData}
                setFormData={setFormData}
                editingQuestion={editingQuestion}
                submitting={submitting}
                subjects={subjects}
                questionSets={questionSets}
            />

            {/* AI Question Generation Modal */}
            <AIGenerateModal
                isOpen={showAIGenerateModal}
                onClose={() => setShowAIGenerateModal(false)}
                onGenerated={handleAIGenerated}
            />

            {/* Special Coding Question Preview Modal */}
            <Modal
                isOpen={showCodingModal}
                onClose={() => {
                    setShowCodingModal(false);
                    setPreviewQuestion(null);
                    setCodingPreviewTab('problem');
                }}
                title=""
                size="2xl"
            >
                {previewQuestion && (
                    <div className="space-y-0 -mt-2">
                        {/* Custom Header */}
                        <div className="flex items-center justify-between pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <FiCode className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900">Coding Question Preview</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="info">
                                            {previewQuestion.programmingLanguage?.toUpperCase() || 'CODE'}
                                        </Badge>
                                        {getDifficultyBadge(previewQuestion.difficulty)}
                                        <Badge variant="secondary">
                                            {previewQuestion.marks} {previewQuestion.marks === 1 ? 'Mark' : 'Marks'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {previewQuestion.timeLimit && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                                        <FiClock className="w-3.5 h-3.5" /> {previewQuestion.timeLimit}ms
                                    </span>
                                )}
                                {previewQuestion.memoryLimit && (
                                    <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                                        <FiCpu className="w-3.5 h-3.5" /> {previewQuestion.memoryLimit}MB
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Preview Tabs */}
                        <div className="flex items-center gap-1 py-3 border-b overflow-x-auto">
                            {[
                                { id: 'problem', label: 'Problem', icon: FiFileText },
                                { id: 'io', label: 'I/O & Constraints', icon: FiList },
                                { id: 'testcases', label: 'Test Cases', icon: FiCheckCircle },
                                { id: 'code', label: 'Code', icon: FiCode },
                            ].map(tab => {
                                const Icon = tab.icon;
                                const isActive = codingPreviewTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setCodingPreviewTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${isActive
                                            ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : ''}`} />
                                        {tab.label}
                                        {tab.id === 'testcases' && (
                                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {(previewQuestion.visibleTestCases?.length || 0) + (previewQuestion.hiddenTestCases?.length || 0)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="py-5 min-h-[300px]">
                            {/* Problem Tab */}
                            {codingPreviewTab === 'problem' && (
                                <div className="space-y-4">
                                    <div className="p-5 bg-gray-50 rounded-xl border">
                                        <h3 className="text-lg font-bold text-gray-900 mb-3 leading-relaxed">
                                            {previewQuestion.questionText}
                                        </h3>
                                    </div>
                                    {previewQuestion.explanation && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                            <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2 text-sm">
                                                <FiHelpCircle className="text-yellow-600" /> Explanation / Editorial
                                            </h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{previewQuestion.explanation}</p>
                                        </div>
                                    )}
                                    <div className="text-sm text-gray-500">
                                        <strong>Category:</strong> {previewQuestion.questionSet?.name || previewQuestion.subject?.name || 'Global Library'}
                                    </div>
                                </div>
                            )}

                            {/* I/O Tab */}
                            {codingPreviewTab === 'io' && (
                                <div className="space-y-5">
                                    {previewQuestion.inputFormat && (
                                        <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl">
                                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                                                <FiArrowLeft className="rotate-180 text-blue-600" /> Input Format
                                            </h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{previewQuestion.inputFormat}</p>
                                        </div>
                                    )}
                                    {previewQuestion.outputFormat && (
                                        <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                                            <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2 text-sm">
                                                <FiChevronRight className="text-emerald-600" /> Output Format
                                            </h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{previewQuestion.outputFormat}</p>
                                        </div>
                                    )}
                                    {previewQuestion.constraints && (
                                        <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-xl">
                                            <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm">
                                                <FiAlertTriangle className="text-amber-600" /> Constraints
                                            </h4>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap font-mono">{previewQuestion.constraints}</p>
                                        </div>
                                    )}
                                    {(previewQuestion.sampleInput || previewQuestion.sampleOutput) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {previewQuestion.sampleInput && (
                                                <div>
                                                    <h4 className="font-bold text-gray-700 mb-2 text-sm">Sample Input</h4>
                                                    <pre className="p-4 bg-gray-100 rounded-xl border text-sm overflow-x-auto font-mono">
                                                        {previewQuestion.sampleInput}
                                                    </pre>
                                                </div>
                                            )}
                                            {previewQuestion.sampleOutput && (
                                                <div>
                                                    <h4 className="font-bold text-gray-700 mb-2 text-sm">Sample Output</h4>
                                                    <pre className="p-4 bg-gray-100 rounded-xl border text-sm overflow-x-auto font-mono">
                                                        {previewQuestion.sampleOutput}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!previewQuestion.inputFormat && !previewQuestion.outputFormat && !previewQuestion.constraints && !previewQuestion.sampleInput && (
                                        <div className="text-center py-12 text-gray-400">
                                            <FiFileText className="mx-auto mb-3 w-10 h-10" />
                                            <p className="font-medium">No I/O format information provided</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Test Cases Tab */}
                            {codingPreviewTab === 'testcases' && (
                                <div className="space-y-6">
                                    {/* Stats */}
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border">
                                        <div className="flex items-center gap-1.5">
                                            <FiEye className="text-green-600 w-4 h-4" />
                                            <span className="text-sm text-green-700 font-bold">{previewQuestion.visibleTestCases?.length || 0} visible</span>
                                        </div>
                                        <div className="h-4 w-px bg-gray-300" />
                                        <div className="flex items-center gap-1.5">
                                            <FiEyeOff className="text-purple-600 w-4 h-4" />
                                            <span className="text-sm text-purple-700 font-bold">{previewQuestion.hiddenTestCases?.length || 0} hidden</span>
                                        </div>
                                    </div>

                                    {/* Visible */}
                                    {previewQuestion.visibleTestCases?.length > 0 && (
                                        <div className="rounded-xl border-2 border-green-200 overflow-hidden">
                                            <div className="bg-green-50 px-5 py-3">
                                                <h4 className="font-bold text-green-900 flex items-center gap-2 text-sm">
                                                    <FiEye className="text-green-600" /> Visible Test Cases
                                                    <span className="text-xs font-normal text-green-600">— students can see</span>
                                                </h4>
                                            </div>
                                            <div className="p-4 space-y-3 bg-white">
                                                {previewQuestion.visibleTestCases.map((tc, idx) => (
                                                    <div key={idx} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                                                        <span className="text-xs font-bold text-green-800 bg-green-100 px-2.5 py-1 rounded-full">
                                                            Test #{idx + 1}
                                                        </span>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">INPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono overflow-x-auto">{tc.input}</pre>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">EXPECTED OUTPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono overflow-x-auto">{tc.expectedOutput}</pre>
                                                            </div>
                                                        </div>
                                                        {tc.explanation && (
                                                            <div className="mt-3 pt-3 border-t border-green-200 text-sm text-gray-600">
                                                                <span className="font-semibold text-xs text-gray-500">EXPLANATION:</span>
                                                                <p className="mt-1">{tc.explanation}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hidden */}
                                    {previewQuestion.hiddenTestCases?.length > 0 && (
                                        <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                                            <div className="bg-purple-50 px-5 py-3">
                                                <h4 className="font-bold text-purple-900 flex items-center gap-2 text-sm">
                                                    <FiEyeOff className="text-purple-600" /> Hidden Test Cases
                                                    <span className="text-xs font-normal text-purple-600">— for evaluation only</span>
                                                </h4>
                                            </div>
                                            <div className="p-4 space-y-3 bg-white">
                                                {previewQuestion.hiddenTestCases.map((tc, idx) => (
                                                    <div key={idx} className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
                                                        <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
                                                            <FiEyeOff className="w-3 h-3" /> Hidden #{idx + 1}
                                                        </span>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">INPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono overflow-x-auto">{tc.input}</pre>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">EXPECTED OUTPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono overflow-x-auto">{tc.expectedOutput}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Legacy test cases fallback */}
                                    {(!previewQuestion.visibleTestCases?.length && !previewQuestion.hiddenTestCases?.length && previewQuestion.testCases?.length > 0) && (
                                        <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                                            <div className="bg-gray-50 px-5 py-3">
                                                <h4 className="font-bold text-gray-900 text-sm">Test Cases (Legacy)</h4>
                                            </div>
                                            <div className="p-4 space-y-3 bg-white">
                                                {previewQuestion.testCases.map((tc, idx) => (
                                                    <div key={idx} className="border rounded-lg p-4 bg-gray-50/30">
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">INPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono">{tc.input}</pre>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-gray-600 text-xs">OUTPUT</span>
                                                                <pre className="mt-1 p-3 bg-white rounded-lg border text-xs font-mono">{tc.expectedOutput}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!previewQuestion.visibleTestCases?.length && !previewQuestion.hiddenTestCases?.length && !previewQuestion.testCases?.length && (
                                        <div className="text-center py-12 text-gray-400">
                                            <FiCheckCircle className="mx-auto mb-3 w-10 h-10" />
                                            <p className="font-medium">No test cases defined</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Code Tab */}
                            {codingPreviewTab === 'code' && (
                                <div className="space-y-5">
                                    {previewQuestion.starterCode && (
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                                                <FiCode className="text-indigo-500" /> Starter Code Template
                                            </h4>
                                            <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm">
                                                <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                                        </div>
                                                        <span className="text-xs text-gray-400 ml-2 font-mono">
                                                            {previewQuestion.programmingLanguage || 'code'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(previewQuestion.starterCode);
                                                            toast.success('Code copied!');
                                                        }}
                                                        className="text-gray-400 hover:text-white transition-colors p-1"
                                                        title="Copy code"
                                                    >
                                                        <FiCopy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <pre className="p-4 bg-gray-900 text-green-300 overflow-x-auto text-sm font-mono">
                                                    <code>{previewQuestion.starterCode}</code>
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                    {previewQuestion.codeSnippet && (
                                        <div>
                                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                                                <FiCode className="text-gray-500" /> Code Snippet / Boilerplate
                                            </h4>
                                            <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto text-sm font-mono border-l-4 border-purple-500">
                                                <code>{previewQuestion.codeSnippet}</code>
                                            </pre>
                                        </div>
                                    )}
                                    {!previewQuestion.starterCode && !previewQuestion.codeSnippet && (
                                        <div className="text-center py-12 text-gray-400">
                                            <FiCode className="mx-auto mb-3 w-10 h-10" />
                                            <p className="font-medium">No code template provided</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-gray-500">
                                {previewQuestion.questionSet?.name || previewQuestion.subject?.name || 'Global Library'}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowCodingModal(false);
                                        setPreviewQuestion(null);
                                        setCodingPreviewTab('problem');
                                        handleEdit(previewQuestion);
                                    }}
                                >
                                    <FiEdit className="mr-2" /> Edit
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowCodingModal(false);
                                        setPreviewQuestion(null);
                                        setCodingPreviewTab('problem');
                                    }}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminQuestions;
