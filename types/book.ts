export interface Book {
  id: string;
  title: string;
  author?: string;
  publish_date?: string;
  summary?: string;
  state: 'In library' | 'Checked out' | 'Lost';
  owner: string;
  current_possessor: string;
  times_read: number;
  last_read?: string;
  date_added: string;
  isbn?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface BookFormData {
  title: string;
  author?: string;
  publish_date?: string;
  summary?: string;
  state: Book['state'];
  owner: string;
  current_possessor: string;
  times_read: number;
  last_read?: string;
  isbn?: string;
  tags?: string;
}

export interface OpenLibraryBook {
  title?: string;
  authors?: Array<{
    key: string;
    name?: string;
  }> | string[];
  publish_date?: string;
  description?: string | {
    type: string;
    value: string;
  };
  subjects?: string[];
  isbn_10?: string[];
  isbn_13?: string[];
  publishers?: string[];
  number_of_pages?: number;
  works?: Array<{
    key: string;
  }>;
}