import { useMemo } from 'react';

const RiskGauge = ({ score }) => {
    const getRiskInfo = (val) => {
        if (val <= 30) return { label: 'Low Risk', color: '#10B981' };
        if (val <= 60) return { label: 'Moderate Risk', color: '#F59E0B' };
        return { label: 'High Risk', color: '#EF4444' };
    };

    const { label, color } = useMemo(() => getRiskInfo(score), [score]);

    // SVG Arc calculation
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="#1f2937"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-800"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke={color}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                        style={{ filter: score > 60 ? 'drop-shadow(0 0 8px #ef4444)' : 'none' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white font-display">{Math.round(score)}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Risk</span>
                </div>
            </div>
            <div
                className="mt-4 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-colors duration-300"
                style={{ backgroundColor: `${color}20`, color: color, border: `1px solid ${color}40` }}
            >
                {label}
            </div>
            {score > 60 && (
                <div className="mt-2 text-[10px] text-red-500 font-bold animate-pulse">
                    ⚠️ HIGH SUSPICION DETECTED
                </div>
            )}
        </div>
    );
};

export default RiskGauge;
