import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

async function getContainerData(code: string) {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  try {
    const res = await fetch(
      `${protocol}://${host}/api/containers/code/${code}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Error fetching container:', error);
    return null;
  }
}

export default async function PublicContainerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getContainerData(code);

  if (!data) {
    notFound();
  }

  const { container, books, childContainers } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {container.name}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Little Free Library
            </p>
            {container.location && (
              <div className="flex items-center justify-center gap-2 text-gray-700 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{container.location}</span>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Maintained by {container.owner}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{books.length}</p>
              <p className="text-sm text-gray-600">Books Available</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{childContainers.length}</p>
              <p className="text-sm text-gray-600">Sub-containers</p>
            </div>
          </div>
        </div>

        {/* Books List */}
        {books.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Available Books
            </h2>
            <div className="grid gap-4">
              {books.map((book: { id: string; title: string; author?: string; summary?: string; state: string; publish_date?: string }) => (
                <div
                  key={book.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                  )}
                  {book.summary && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {book.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      book.state === 'In library'
                        ? 'bg-green-100 text-green-800'
                        : book.state === 'Checked out'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {book.state}
                    </span>
                    {book.publish_date && (
                      <span className="text-gray-500">
                        Published: {book.publish_date.split('-')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Child Containers */}
        {childContainers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Nested Collections
            </h2>
            <div className="grid gap-3">
              {childContainers.map((child: { id: string; name: string; location?: string }) => (
                <div
                  key={child.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {child.name}
                  </h3>
                  {child.location && (
                    <p className="text-sm text-gray-600 mt-1">{child.location}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {books.length === 0 && childContainers.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              This library is currently empty
            </h3>
            <p className="text-gray-600">
              Check back soon for new books!
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Share this link to let others see what&apos;s available: <br />
            <span className="font-mono text-blue-600">{code}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
