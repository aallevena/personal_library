'use client';

import { useState } from 'react';
import BookLibrary from '../components/BookLibrary';
import UsersPage from '../components/UsersPage';
import AnalyticsPage from '../components/AnalyticsPage';
import BottomNavigation, { TabType } from '../components/BottomNavigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('books');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content area with bottom padding for fixed navigation */}
      <div className="pb-20">
        {activeTab === 'books' && <BookLibrary />}
        {activeTab === 'users' && <UsersPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
