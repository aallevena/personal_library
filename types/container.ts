export interface Container {
  id: string;
  name: string;
  owner: string;
  tags?: string;
  location?: string;
  parent_container_id?: string;
  shareable_code: string;
  is_household: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContainerFormData {
  name: string;
  owner: string;
  tags?: string;
  location?: string;
  parent_container_id?: string;
}

export interface ContainerAuditLog {
  id: string;
  book_id: string;
  from_container_id: string;
  to_container_id: string;
  moved_at: string;
}

export interface ContainerWithContents {
  container: Container;
  books: any[]; // Will be Book[] from book.ts
  childContainers: ContainerWithContents[];
}
