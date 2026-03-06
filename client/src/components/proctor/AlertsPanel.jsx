import { SEVERITY_COLORS } from './constants';
import { FiX, FiAlertTriangle, FiInfo, FiAlertOctagon } from 'react-icons/fi';

const AlertsPanel = ({ alerts, onDismiss }) => {
    const unresolvedAlerts = alerts.filter(a => !a.dismissed);

    const getAlertIcon = (severity) => {
        switch (severity) {
            case 'critical': return FiAlertOctagon;
            case 'high': return FiAlertTriangle;
            default: return FiInfo;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0c10] border-l border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest font-display">Active Alerts</h3>
                    {unresolvedAlerts.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600/20 border border-red-500/50 text-[10px] font-black text-red-500 animate-pulse">
                            {unresolvedAlerts.length}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {unresolvedAlerts.map((alert) => {
                    const Icon = getAlertIcon(alert.severity);
                    return (
                        <div
                            key={alert.id}
                            className="group relative p-3 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-700 transition-all duration-300"
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5"
                                    style={{ color: SEVERITY_COLORS[alert.severity] }}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className="text-[9px] font-black uppercase tracking-wider"
                                            style={{ color: SEVERITY_COLORS[alert.severity] }}
                                        >
                                            {alert.severity}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-600">
                                            {new Date(alert.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <h4 className="text-[11px] font-bold text-gray-200 mb-1 leading-snug">
                                        {alert.type.replace('_', ' ').toUpperCase()}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                                        {alert.description}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDismiss(alert.id)}
                                    className="p-1 rounded-md text-gray-600 hover:text-white hover:bg-gray-800 transition-colors"
                                    aria-label="Dismiss alert"
                                >
                                    <FiX className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {unresolvedAlerts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-2 opacity-50 py-12">
                        <div className="p-4 rounded-full bg-gray-900 border border-gray-800">
                            <FiInfo className="w-8 h-8 text-green-500/50" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Active Threats</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;
