# Personal Library Web App

## Executive Summary
A family-oriented personal library management system built with modern web technologies. Enables book tracking, ISBN lookup, and library management with a clean, responsive interface. Fully deployed and operational in production.

**🚀 Live Application**: https://personal-library-flax.vercel.app/
**📦 Repository**: GitHub integration with automatic deployments
**🏗️ Architecture**: Serverless Next.js application with managed PostgreSQL database

### Technology Stack
- **Frontend**: Next.js 15.5.2 with React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Neon PostgreSQL (managed cloud database)
- **External APIs**: Open Library API for ISBN book data lookup
- **Deployment**: Vercel (auto-deploy from GitHub)
- **Development**: ESLint, TypeScript compiler, npm package management

### Core Features Implemented
- **Book Management**: Full CRUD operations with form validation and duplicate detection
- **User Management**: Full CRUD operations with inline editing and book reassignment on delete
- **Bottom Navigation**: Mobile-first tabbed navigation (Books, Users, Analytics)
- **ISBN Lookup**: Automatic book data population via Open Library API
- **Barcode Scanning**: Camera-based ISBN scanning for quick book entry
- **FastScan Mode**: Bulk book scanning with auto-add, duplicate detection, and live statistics
- **State Tracking**: Book status management (In library, Checked out, Lost)
- **Responsive Design**: Mobile-first UI with Tailwind CSS and touch-optimized controls
- **Real-time Filtering**: Dynamic book filtering by status, owner, and possessor
- **Analytics Dashboard**: Live stats showing total books, users, and state breakdowns
- **Error Handling**: Comprehensive error states with specific field-level messages
- **Duplicate Prevention**: Database-level UNIQUE constraint on ISBN+Owner combination

### Database Schema
```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  publish_date DATE,
  summary TEXT,
  state TEXT NOT NULL CHECK (state IN ('In library', 'Checked out', 'Lost')),
  owner TEXT NOT NULL,
  current_possessor TEXT NOT NULL,
  times_read INTEGER DEFAULT 0,
  last_read DATE,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  isbn TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(isbn, owner)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Development History

### Phase 1: Project Setup ✅
1. ✅ Initialize Next.js project with TypeScript
2. ✅ Set up database connection architecture
3. ✅ Design and implement database schema
4. ✅ Configure Tailwind CSS for styling

### Phase 2: Core Backend ✅
5. ✅ Create Open Library API service abstraction
6. ✅ Build book management API routes (CRUD operations)
7. ✅ Implement ISBN lookup functionality

### Phase 3: Frontend UI ✅
8. ✅ Create book listing/library view component
9. ✅ Build add/edit book form with ISBN lookup
10. ✅ Implement book management (delete, update status)
11. ✅ Add loading states and error handling

### Phase 4: Deployment ✅
12. ✅ Set up Vercel deployment configuration
13. ✅ Test production deployment  
14. ✅ Document deployment process

## API Endpoints

### Books
- `GET /api/books` - List all books with optional filtering
- `POST /api/books` - Create new book entry (with duplicate detection)
- `GET /api/books/[id]` - Retrieve specific book details
- `PUT /api/books/[id]` - Update existing book
- `DELETE /api/books/[id]` - Remove book from library
- `GET /api/isbn/[isbn]` - ISBN lookup via Open Library API

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get single user
- `PUT /api/users/[id]` - Update user name
- `DELETE /api/users/[id]` - Delete user with book reassignment

### Utilities
- `GET /api/init` - Initialize/reinitialize database schema
- `GET /api/cleanup-duplicates` - Remove duplicate books (keeps oldest)

## Component Architecture
- **BottomNavigation.tsx**: Fixed bottom navigation with 3 tabs (Books, Users, Analytics)
- **BookLibrary.tsx**: Main library view with state management and filtering
- **UsersPage.tsx**: User management with table view, inline editing, and delete with reassignment
- **AnalyticsPage.tsx**: Stats dashboard with live metrics and coming soon features
- **BookCard.tsx**: Individual book display with inline editing
- **AddBookForm.tsx**: Modal form for book creation/editing with ISBN lookup
- **AddUserForm.tsx**: Modal form for user creation
- **BarcodeScanner.tsx**: Camera-based barcode/QR code scanner for ISBNs
- **FastScanModal.tsx**: Setup modal for FastScan mode with default values
- **FastScanScanner.tsx**: Bulk scanning interface with duplicate detection and statistics
- **Database Layer** (`lib/db.ts`): Centralized database operations (SQLite + PostgreSQL)
- **API Service** (`lib/openLibrary.ts`): External API abstraction for ISBN lookup

## Deployment Configuration
- **Environment Variables**: Database connection strings configured in Vercel
- **Build Process**: TypeScript compilation with ESLint validation
- **Auto-deployment**: GitHub integration triggers builds on push
- **Database**: Neon PostgreSQL with connection pooling

---
## Completed Tickets:
- PL-1 #bug Add book: Author field isn't autopopulating from the API ✅
- PL-2 #bug Add book: If either date field is left blank then the form returns an error. Blank fields should be allowed. ✅
- PL-3 #bug Overall: On a browser's dark mode all input text is hard to read ✅
- PL-4 #feature Add book: Camera barcode scanning for ISBN lookup ✅
- PL-6 #bug Edit book is broken. Make sure I can increment read count. ✅
- PL-10 #feature Add users. Anyone can create a user, and assign ownership to them. ✅
- PL-11 #feature Add user possession view. Page to search by user to see what books they have in their possession right now. ✅
- PL-12 #bug Summary text in edit book modal is too light grey. Make it always same as the above fields (I see black text). ✅
- PL-16 #bug Mobile: Filter controls (2 buttons + 3 dropdowns) overflow on mobile screens. Need responsive wrapping. ✅
- PL-17 #bug Mobile: Missing viewport meta tag in layout.tsx prevents proper mobile scaling. ✅
- PL-18 #bug Mobile: Touch targets too small (buttons, dropdowns need larger tap areas for accessibility). ✅
- PL-19 #bug Mobile: Add book modal width not optimized for small screens (max-w-2xl too wide). ✅
- PL-7 #feature FastScan Mode for bulk book scanning with auto-add and duplicate detection. ✅
- PL-22 #feature Bottom navigation with Books, Users, and Analytics pages. Full user CRUD with inline editing and book reassignment. ✅
- PL-23 #feature Add user filter bar at the top of Analytics page to filter statistics by specific user (show only that user's books). ✅

## Feature Backlog
*Use PL-XXX format for ticket tracking (e.g., PL-001, PL-002)*
- PL-5 #tech-debt Barcode Scanner: Remove timer-based workarounds in BarcodeScanner component. Replace setTimeout delays with proper React lifecycle hooks and state management to eliminate race conditions between React rendering and html5-qrcode library initialization.
- PL-8 #feature Analytics page - have a page showing total number of books + pie chart of read vs unread and utilization rate (books lent out + books read / total books)
- PL-9 #feature Add utilization rate to top of home page above where all the books are listed.
- PL-13 #feature Audit log for analytics: Capture events when status, owner, or possessor changes, or when read count is incremented.
- PL-15 #feature Search bar at the top for filtering on titles.
- PL-20 #bug Mobile: BookCard Edit/Delete buttons too small and could overlap with long titles.
- PL-21 #bug Mobile: Status badge and dropdown controls could overflow on small screens with long state names.

<!-- Add new feature tickets below -->
