import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

const Sidebar = ({ navigation, isOpen, onClose }) => {
  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:shadow-md min-h-[calc(100vh-4rem)]',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <nav className="p-4 space-y-2">
        {navigation.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )
            }
          >
            {item.icon && <item.icon className="h-5 w-5" />}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
