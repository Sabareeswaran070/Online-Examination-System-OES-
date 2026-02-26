import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ navigation, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onMenuClick={toggleSidebar} />
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity"
            onClick={closeSidebar}
          />
        )}

        <Sidebar
          navigation={navigation}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
