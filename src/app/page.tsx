'use client';

import BookLibrary from '../components/BookLibrary';
import UsersPage from '../components/UsersPage';
import AnalyticsPage from '../components/AnalyticsPage';
import ContainersPage from '../components/ContainersPage';
import BottomNavigation from '../components/BottomNavigation';
import { FilterProvider, useFilter } from '../contexts/FilterContext';

function HomeContent() {
  const { selectedTab, setSelectedTab } = useFilter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content area with bottom padding for fixed navigation */}
      <div className="pb-20">
        {selectedTab === 'books' && <BookLibrary />}
        {selectedTab === 'containers' && <ContainersPage />}
        {selectedTab === 'users' && <UsersPage />}
        {selectedTab === 'analytics' && <AnalyticsPage />}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={selectedTab as 'books' | 'containers' | 'users' | 'analytics'}
        onTabChange={(tab: string) => setSelectedTab(tab)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <FilterProvider>
      <HomeContent />
    </FilterProvider>
  );
}
