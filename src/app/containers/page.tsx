import ContainerManager from '@/components/ContainerManager';

async function getContainers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/containers`, {
      cache: 'no-store'
    });
    const data = await res.json();
    return data.success ? data.containers : [];
  } catch (error) {
    console.error('Error fetching containers:', error);
    return [];
  }
}

async function getBooks() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/books`, {
      cache: 'no-store'
    });
    const data = await res.json();
    return data.success ? data.books : [];
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
}

export default async function ContainersPage() {
  const [containers, books] = await Promise.all([
    getContainers(),
    getBooks()
  ]);

  return <ContainerManager initialContainers={containers} initialBooks={books} />;
}
