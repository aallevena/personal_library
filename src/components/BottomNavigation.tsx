'use client';

export type TabType = 'books' | 'users' | 'analytics';

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'books' as TabType, label: 'Books', icon: '📚' },
    { id: 'users' as TabType, label: 'Users', icon: '👥' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: '📊' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-20 z-40">
      <div className="h-full flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                min-h-[44px] transition-colors duration-200
                ${isActive
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-gray-600 hover:bg-gray-50'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
