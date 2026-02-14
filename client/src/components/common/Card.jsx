import { clsx } from 'clsx';

const Card = ({ children, className = '', title, action, ...props }) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow-md', className)} {...props}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
