export interface User {
  id: string;
  name: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  name: string;
  tags?: string;
}
