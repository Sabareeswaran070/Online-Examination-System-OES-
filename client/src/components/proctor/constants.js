export const SEVERITY_COLORS = {
    critical: '#DC2626', // red-600
    high: '#EA580C',     // orange-600
    medium: '#CA8A04',   // amber-600
    low: '#4B5563',      // gray-600
};

export const SIGNAL_WEIGHTS = {
    tab_switch: 12,
    copy: 12,
    paste: 12,
    face_missing: 12,
    multi_face: 20,
    right_click: 6,
    window_blur: 6,
    fullscreen_exit: 6,
    idle: 2,
    rapid_type: 2,
    mouse_leave: 6,
};

export const FACE_STATUS_LABELS = {
    detected: '🟢 Face Detected',
    missing: '🔴 Face Not Visible',
    multiple: '🟡 Multiple Faces Detected',
    unavailable: '⚫ Camera Unavailable',
};

export const RISK_LEVELS = [
    { min: 0, max: 30, label: 'Low Risk', color: '#10B981' }, // green-500
    { min: 31, max: 60, label: 'Moderate Risk', color: '#F59E0B' }, // amber-500
    { min: 61, max: 100, label: 'High Risk', color: '#EF4444' }, // red-500
];
