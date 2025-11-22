'use client';

import { useState, useEffect } from 'react';
import { Container } from '../../types/container';
import { Book } from '../app/lib/db';
import ContainerManager from './ContainerManager';

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [containersRes, booksRes] = await Promise.all([
          fetch('/api/containers'),
          fetch('/api/books')
        ]);

        const containersData = await containersRes.json();
        const booksData = await booksRes.json();

        if (containersData.success) {
          setContainers(containersData.containers);
        }

        if (booksData.success) {
          setBooks(booksData.books);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading containers...</p>
        </div>
      </div>
    );
  }

  return <ContainerManager initialContainers={containers} initialBooks={books} />;
}
