import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiLogOut, FiBell, FiMenu } from 'react-icons/fi';
import { formatRoleName } from '../../utils/helpers';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 mr-2 text-gray-600 hover:text-gray-900 lg:hidden rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Open sidebar"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            <Link to="/dashboard" className="flex items-center">
              <div className="h-8 w-8 md:h-10 md:w-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">E</span>
              </div>
              <span className="ml-2 md:ml-3 text-lg md:text-xl font-bold text-gray-900 truncate max-w-[120px] md:max-w-none">
                Exam System
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 hidden sm:block">
              <FiBell className="h-6 w-6" />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{formatRoleName(user?.role)}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <FiUser className="h-4 w-4 md:h-5 md:w-5 text-primary-600" />
              </div>
              <button
                onClick={logout}
                className="p-1 md:p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-50"
                title="Logout"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
