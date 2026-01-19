# Quick Start Guide - Running Keysha Frontend Locally

## Step-by-Step Instructions

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required packages (React, Vite, Tailwind, etc.)

### 3. Set Up Environment Variables

Create a `.env` file in the `frontend/` directory:

```bash
# On Mac/Linux
cp .env.example .env

# Or create manually
touch .env
```

Then edit `.env` and add your configuration. For local testing without backend, you can use placeholder values:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001/auth
VITE_ITEM_SERVICE_URL=http://localhost:3001/items
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_ENV=development
```

**Note:** 
- The app will run even with placeholder values, but API calls will fail until your backend is running.
- **Google Client ID is NOT needed in frontend** - it's stored on the backend. The frontend only redirects to URLs provided by the backend.

### 4. Start Development Server

```bash
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5. Open in Browser

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What You'll See

### Without Backend Running:
- ✅ Home page loads
- ✅ Login page loads
- ✅ UI components render
- ❌ OAuth login will fail (backend not running)
- ❌ API calls will fail (backend not running)

### With Backend Running:
- ✅ Full OAuth flow works
- ✅ Can log in with Google
- ✅ Dashboard loads with data
- ✅ All features functional

## Troubleshooting

### Port Already in Use
If port 3000 is taken, Vite will automatically use the next available port (3001, 3002, etc.). Check the terminal output for the actual URL.

### Module Not Found Errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Check TypeScript compilation
npm run build
```

### Tailwind Styles Not Loading
Make sure `src/index.css` is imported in `src/main.tsx` (it should be already).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Next Steps

1. **Test UI**: Navigate through pages to see the UI structure
2. **Start Backend**: Once your backend services are ready, update `.env` with actual URLs
3. **Test OAuth**: Configure Google OAuth credentials and test login flow
4. **Connect APIs**: Test API integration with your backend services
