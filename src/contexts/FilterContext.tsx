'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Book } from '../app/lib/db';

interface BookFilters {
  state?: Book['state'] | 'all';
  owner?: string;
  possessor?: string;
  tags?: string; // General search query (searches titles, authors, and tags)
  specialFilter?: 'neverUsed' | null;
}

interface FilterContextType {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  bookFilters: BookFilters;
  setBookFilters: (filters: BookFilters) => void;
  clearBookFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedTab, setSelectedTab] = useState('books');
  const [bookFilters, setBookFilters] = useState<BookFilters>({
    state: 'all',
    owner: undefined,
    possessor: undefined,
    tags: undefined,
    specialFilter: null
  });

  const clearBookFilters = () => {
    setBookFilters({
      state: 'all',
      owner: undefined,
      possessor: undefined,
      tags: undefined,
      specialFilter: null
    });
  };

  return (
    <FilterContext.Provider
      value={{
        selectedTab,
        setSelectedTab,
        bookFilters,
        setBookFilters,
        clearBookFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
