# Personal Library Web App

A family personal library management system built with Next.js, TypeScript, and Vercel Postgres. Track your books, manage lending status, and discover new titles through ISBN lookup.

## Features

- 📚 Add books via ISBN lookup (auto-populates book information)
- ✏️ Manual book entry and editing
- 📊 Track reading status and book location
- 👥 Monitor who has borrowed books
- 📱 Responsive design for mobile and desktop

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: Vercel Postgres
- **Styling**: Tailwind CSS
- **Book API**: Open Library API
- **Deployment**: Vercel

## Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Git

## Local Development Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd PersonalLibrary
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your database credentials:

```env
# Database
POSTGRES_URL="your-vercel-postgres-url"
POSTGRES_PRISMA_URL="your-vercel-postgres-prisma-url"
POSTGRES_URL_NO_SSL="your-vercel-postgres-no-ssl-url"
POSTGRES_URL_NON_POOLING="your-vercel-postgres-non-pooling-url"
POSTGRES_USER="your-postgres-user"
POSTGRES_HOST="your-postgres-host"
POSTGRES_PASSWORD="your-postgres-password"
POSTGRES_DATABASE="your-postgres-database"
```

### 3. Database Setup

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Link your project to Vercel (creates Postgres database)
vercel link

# Pull environment variables from Vercel
vercel env pull .env.local

# Run database migrations
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Initialize Database

After starting the dev server, seed the database by visiting:

```
http://localhost:3000/api/init
```

This will create the necessary database tables and initial data.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open database studio (if using Prisma)

## Project Structure

```
PersonalLibrary/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/           # API routes
│   │   ├── components/    # React components
│   │   └── lib/          # Utilities and configurations
├── public/               # Static assets
├── types/                # TypeScript type definitions
├── .env.local           # Environment variables (create this)
├── .env.example         # Environment variables template
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Database Schema

```sql
Books Table:
- id (UUID, Primary Key)
- title (Text, Required)
- author (Text)
- publish_date (Date)
- summary (Text)
- state (Enum: "In library", "Checked out", "Lost", Required)
- current_possessor (Text, Required)
- times_read (Integer, Default: 0)
- last_read (Date, Nullable)
- date_added (Date, Required)
- isbn (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
```

## API Endpoints

- `GET /api/books` - Retrieve all books
- `POST /api/books` - Create a new book
- `GET /api/books/[id]` - Get a specific book
- `PUT /api/books/[id]` - Update a book
- `DELETE /api/books/[id]` - Delete a book
- `GET /api/isbn/[isbn]` - Lookup book by ISBN

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy on every push to main branch
4. Environment variables will be automatically populated if you used `vercel link`

### Environment Variables in Production

Make sure these are set in your Vercel project settings:
- All `POSTGRES_*` variables (automatically set when using Vercel Postgres)

## Book Data Source

This app uses the [Open Library API](https://openlibrary.org/developers/api) for ISBN lookups. The API is free and doesn't require authentication, making it perfect for a family project.

## Future Features

- 📸 ISBN barcode scanning via camera
- 🔄 Check-in/check-out workflow
- 👤 Multi-user authentication
- 📈 Reading statistics and insights
- 📋 Reading lists and recommendations

## Contributing

This is a family project, but suggestions and improvements are welcome! Please open an issue or submit a pull request.

## License

This project is for personal use.