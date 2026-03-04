import React from 'react';
import { FiCode, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CodeViewer = ({ code, language }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard!');
    };

    const lines = code ? code.split('\n') : [];

    return (
        <div className="bg-[#1E1E1E] rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <div className="px-5 py-3 bg-[#252526] border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 mr-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                    </div>
                    <FiCode className="text-gray-400" />
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        {language} Source
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    title="Copy Code"
                >
                    <FiCopy size={16} />
                </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                <div className="flex font-mono text-sm leading-relaxed min-w-full">
                    {/* Line Numbers */}
                    <div className="py-4 bg-[#1E1E1E] border-r border-gray-800 text-right select-none pr-4 pl-5 text-gray-600 min-w-[60px]">
                        {lines.map((_, i) => (
                            <div key={i}>{i + 1}</div>
                        ))}
                    </div>

                    {/* Code Content */}
                    <pre className="py-4 px-6 text-gray-300 w-full overflow-visible whitespace-pre">
                        <code>
                            {code || '// No code submitted'}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default CodeViewer;
