# Deployment Instructions

## Vercel Deployment

### Prerequisites
- GitHub repository with this code
- Vercel account connected to GitHub

### Step 1: Create Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js configuration

### Step 2: Set up Vercel Postgres Database
1. In your Vercel project dashboard, go to "Storage" tab
2. Click "Create Database" → "Postgres"
3. Choose a database name (e.g., "personal-library-db")
4. Select your preferred region
5. Click "Create"

### Step 3: Get Database Connection Strings
1. In the Postgres database page, go to "Settings" tab
2. Copy all the connection strings:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` 
   - `POSTGRES_URL_NO_SSL`
   - `POSTGRES_URL_NON_POOLING`
   - Individual credentials (`POSTGRES_USER`, `POSTGRES_HOST`, etc.)

### Step 4: Set Environment Variables
1. Go to your Vercel project → "Settings" → "Environment Variables"
2. Add all the database connection strings from Step 3
3. Set for "Production", "Preview", and "Development" environments

### Step 5: Initialize Database Schema
1. After first deployment, go to your deployed app URL
2. The database tables will be created automatically on first API call
3. Or manually run the schema creation via Vercel Functions

### Step 6: Deploy
1. Push your code to GitHub
2. Vercel will automatically deploy
3. Check deployment logs for any issues

## Local Development with Production Database
To use the production database locally:
```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Start development server
npm run dev
```

## Troubleshooting
- Check Vercel deployment logs if build fails
- Verify environment variables are set correctly
- Ensure database connection strings include proper SSL settings