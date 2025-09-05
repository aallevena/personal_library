export interface Book {
  id: string;
  title: string;
  author?: string;
  publish_date?: string;
  summary?: string;
  state: 'In library' | 'Checked out' | 'Lost';
  current_possessor: string;
  times_read: number;
  last_read?: string;
  date_added: string;
  isbn?: string;
  created_at: string;
  updated_at: string;
}

export interface BookFormData {
  title: string;
  author?: string;
  publish_date?: string;
  summary?: string;
  state: Book['state'];
  current_possessor: string;
  times_read: number;
  last_read?: string;
  isbn?: string;
}

export interface OpenLibraryBook {
  title?: string;
  authors?: Array<{
    name: string;
  }>;
  publish_date?: string;
  description?: string | {
    value: string;
  };
  subjects?: string[];
  isbn_10?: string[];
  isbn_13?: string[];
}