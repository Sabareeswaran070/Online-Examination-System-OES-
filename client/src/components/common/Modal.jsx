import { clsx } from 'clsx';

const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md w-full',
    md: 'max-w-2xl w-full',
    lg: 'max-w-4xl w-full',
    xl: 'max-w-6xl w-full',
    '2xl': 'max-w-[85rem] w-full',
    full: 'w-screen h-screen m-0 rounded-none',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto w-full h-full">
      <div className={clsx("flex items-center justify-center p-4", size === 'full' ? 'min-h-screen p-0 m-0' : 'min-h-screen')}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className={clsx(
          'relative bg-white shadow-xl',
          size === 'full' ? 'w-full h-full min-h-screen flex flex-col' : `rounded-lg w-full ${sizes[size]}`
        )}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className={clsx(
            "px-6 py-4 overflow-y-auto",
            size === 'full' ? "flex-1 h-full" : "max-h-[calc(100vh-200px)]"
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
