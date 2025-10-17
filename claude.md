# Personal Library - Codebase Knowledge

## Project Overview
A Next.js 15.5.2 personal library management application for tracking books and users. Built with TypeScript, TailwindCSS, and SQLite (with PostgreSQL support).

## Tech Stack
- **Framework**: Next.js 15.5.2 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4
- **Database**: SQLite (development) via `better-sqlite3`, PostgreSQL support via `@vercel/postgres`
- **Runtime**: Node.js

## Project Structure

```
/Users/kdawkins/Development/personal_library/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout with metadata
│   │   ├── page.tsx             # Home page - renders BookLibrary
│   │   ├── globals.css          # TailwindCSS styles
│   │   ├── api/                 # API routes (Next.js App Router pattern)
│   │   │   ├── books/
│   │   │   │   ├── route.ts     # GET (all), POST (create)
│   │   │   │   └── [id]/route.ts # GET (one), PUT (update), DELETE
│   │   │   ├── users/
│   │   │   │   └── route.ts     # GET (all), POST (create)
│   │   │   ├── isbn/
│   │   │   │   └── [isbn]/route.ts # ISBN lookup via Open Library API
│   │   │   └── init/
│   │   │       └── route.ts     # Database initialization
│   │   └── lib/
│   │       ├── db.ts            # Database functions & schema
│   │       └── openLibrary.ts   # External API integration
│   └── components/
│       ├── BookLibrary.tsx      # Main component with list & state management
│       ├── BookCard.tsx         # Individual book display card
│       ├── AddBookForm.tsx      # Modal form for create/edit books
│       ├── AddUserForm.tsx      # Modal form for creating users
│       └── BarcodeScanner.tsx   # QR/Barcode scanner for ISBN
├── types/
│   ├── book.ts                  # Book TypeScript interfaces
│   └── user.ts                  # User TypeScript interfaces
├── local.db                     # SQLite database (gitignored)
├── .env.local                   # Environment variables
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Database Architecture

### Database Selection
- Environment variable `USE_SQLITE=true` determines database type
- SQLite used for local development
- PostgreSQL support for production (Vercel)

### Database Schema

#### Books Table
```typescript
interface Book {
  id: string;                    // INTEGER (SQLite) / UUID (Postgres)
  title: string;                 // Required
  author?: string;
  publish_date?: string;
  summary?: string;
  state: 'In library' | 'Checked out' | 'Lost';  // Required, enum
  current_possessor: string;     // Required
  times_read: number;            // Default: 0
  last_read?: string;
  date_added: string;            // Default: current date
  isbn?: string;
  created_at: string;            // DB-assigned: datetime('now')
  updated_at: string;            // DB-assigned: datetime('now')
}
```

#### Users Table
```typescript
interface User {
  id: string;                    // INTEGER (SQLite) / UUID (Postgres)
  name: string;                  // Required
  created_at: string;            // DB-assigned: datetime('now')
  updated_at: string;            // DB-assigned: datetime('now')
}
```

### Database Functions (src/app/lib/db.ts)

**Books:**
- `initializeDatabase()` - Creates tables for both SQLite and PostgreSQL
- `getAllBooks()` - Returns all books sorted by created_at DESC
- `getBookById(id)` - Returns single book
- `createBook(book)` - Creates book (omit id, created_at, updated_at)
- `updateBook(id, updates)` - Partial update, auto-updates updated_at
- `deleteBook(id)` - Deletes book, returns boolean
- `getBooksByState(state)` - Filters by state

**Users:**
- `getAllUsers()` - Returns all users sorted by created_at DESC
- `createUser(userData)` - Creates user (only name field required)

**Key Pattern:** All functions handle both SQLite and PostgreSQL by checking `USE_SQLITE` flag.

## API Routes Pattern

### Standard Response Format
```typescript
// Success
{ success: true, [resource]: object }  // Status: 200 or 201

// Error
{ success: false, error: string }      // Status: 400, 404, or 500
```

### Status Codes
- `200` - Successful GET/PUT/DELETE
- `201` - Successful POST (resource created)
- `400` - Client error (validation failure)
- `404` - Resource not found
- `500` - Server error

### Example: POST /api/users
```typescript
// Request validation
if (!body.name || body.name.trim() === '') {
  return NextResponse.json(
    { success: false, error: 'Missing required field: name is required and cannot be empty' },
    { status: 400 }
  );
}

// Success response
return NextResponse.json({
  success: true,
  user: newUser
}, { status: 201 });
```

## Component Patterns

### State Management (BookLibrary.tsx)
```typescript
// Main state
const [books, setBooks] = useState<Book[]>(initialBooks);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [showAddForm, setShowAddForm] = useState(false);
const [editingBook, setEditingBook] = useState<Book | null>(null);
const [filter, setFilter] = useState<Book['state'] | 'all'>('all');
const [showAddUserForm, setShowAddUserForm] = useState(false);

// CRUD handlers update local state optimistically
const handleAddBook = (book: Book) => {
  setBooks(prev => [book, ...prev]);  // Prepend to array
  setShowAddForm(false);
};

const handleEditBook = (book: Book) => {
  setBooks(prev => prev.map(b => b.id === book.id ? book : b));
  setEditingBook(null);
};

const handleDeleteBook = async (id: string) => {
  // After API call succeeds:
  setBooks(prev => prev.filter(book => book.id !== id));
};
```

### Modal Form Pattern (AddBookForm.tsx, AddUserForm.tsx)
```typescript
interface FormProps {
  book?: Book | null;           // Optional - for edit mode
  onSuccess: (book: Book) => void;
  onCancel: () => void;
}

// Form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitError(null);
  setSubmitting(true);

  try {
    const url = book ? `/api/books/${book.id}` : '/api/books';
    const method = book ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      onSuccess(data.book);
    } else {
      // Differentiate errors by status code
      if (response.status >= 400 && response.status < 500) {
        setSubmitError(data.error || 'Invalid request. Please check your input.');
      } else if (response.status >= 500) {
        setSubmitError('Something went wrong. Please try again.');
      } else {
        setSubmitError(data.error || 'Failed to save book.');
      }
    }
  } catch (error) {
    setSubmitError('Something went wrong. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

### Modal Styling Pattern
```typescript
// Overlay
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"

// Modal Card
className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"

// Buttons
className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"

// Inputs
className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"

// Error Messages
className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600"
```

## Features

### Books
- **CRUD Operations**: Create, Read, Update, Delete
- **ISBN Lookup**: Integrates with Open Library API to auto-fill book details
- **Barcode Scanner**: QR/Barcode scanning for ISBN entry
- **State Management**: Track books as "In library", "Checked out", or "Lost"
- **Filtering**: Filter books by state
- **Tracking**: Times read, last read date, current possessor

### Users
- **Create**: Simple user creation with name field
- **List**: Fetch all users (GET /api/users)
- **DB-Managed Fields**: id, created_at, updated_at automatically assigned

## External Integrations

### Open Library API
- **Endpoint**: `/api/isbn/[isbn]`
- **Purpose**: Lookup book metadata by ISBN
- **Implementation**: `src/app/lib/openLibrary.ts`
- **Response**: Title, author, publish date, summary

## Development Workflow

### Starting Development
```bash
npm run dev  # Starts on http://localhost:3000
```

### Database Initialization
```bash
curl -X GET http://localhost:3000/api/init
```

### Environment Variables (.env.local)
```bash
USE_SQLITE=true                # Use SQLite for local development
POSTGRES_URL=...               # PostgreSQL connection (production)
```

## Git Branch Naming Convention
Pattern: `username.feature-name`
Example: `kdawkins.user-management`, `aallevena.errorhandling`

## Common Workflows

### Adding a New Resource Type (e.g., "Authors")

1. **Database Layer** (`src/app/lib/db.ts`)
   - Add TypeScript interface
   - Add table creation in `initializeDatabase()` for both SQLite and PostgreSQL
   - Add CRUD functions following the pattern of books/users

2. **Type Definitions** (`types/author.ts`)
   - Export resource interface
   - Export form data interface (omit DB-assigned fields)

3. **API Routes** (`src/app/api/authors/route.ts`)
   - GET handler for fetching all
   - POST handler for creation with validation
   - Optional: `[id]/route.ts` for single resource operations

4. **Components**
   - Create modal form component (e.g., `AddAuthorForm.tsx`)
   - Create card/display component (e.g., `AuthorCard.tsx`)
   - Create list/management component (e.g., `AuthorLibrary.tsx`)
   - Add to main page or create dedicated page

5. **Testing**
   - Initialize database: `curl http://localhost:3000/api/init`
   - Test creation: `curl -X POST http://localhost:3000/api/authors -H "Content-Type: application/json" -d '{"name":"..."}'`
   - Test retrieval: `curl http://localhost:3000/api/authors`

### Database Best Practices
- Always provide both SQLite and PostgreSQL implementations
- Use DB defaults for timestamps: `DEFAULT (datetime('now'))` (SQLite) or `DEFAULT CURRENT_TIMESTAMP` (Postgres)
- Use autoincrement IDs for SQLite, UUIDs for PostgreSQL
- Convert numeric IDs to strings in response: `id: String(row.id)`

### Form Validation Pattern
1. Check required fields early and return 400 with specific error
2. Validate enums/formats if applicable
3. Trim whitespace from string inputs
4. Provide clear, actionable error messages

## Key Technical Decisions

1. **App Router over Pages Router**: Using Next.js 15's app directory for better performance and developer experience
2. **SQLite for Development**: Fast local development without external dependencies
3. **Optimistic UI Updates**: Update local state immediately, handle errors gracefully
4. **Modal-based Forms**: Consistent UX for all creation/editing operations
5. **DB-Managed Timestamps**: Database handles created_at/updated_at to ensure accuracy
6. **Type Safety**: Full TypeScript coverage with strict interfaces

## Future Enhancement Ideas
- User-to-book relationships (ownership, reading lists)
- Full user CRUD operations (update, delete)
- User profile pages
- Reading statistics and analytics
- Book recommendations
- Multi-user checkout system
- Search functionality
- Pagination for large datasets
- Image uploads for book covers
- Tags and categories
- Export/import functionality

## Troubleshooting

### Database Issues
- If tables don't exist, call `/api/init` to initialize
- Check `USE_SQLITE` environment variable
- SQLite database is at `./local.db`

### TypeScript Errors
- Run `npm run type-check` to check for type errors
- Ensure interfaces match between types/, src/app/lib/db.ts, and components

### API Issues
- Check browser console for fetch errors
- Verify response format matches `{ success: boolean, ... }` pattern
- Ensure proper status codes are returned

## Notes
- The app uses client-side components ('use client') for interactivity
- TailwindCSS 4 is configured in `tailwind.config.ts`
- All forms handle both create and edit modes (where applicable)
- Error messages are user-friendly and actionable
