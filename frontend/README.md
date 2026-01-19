# Keysha Frontend

React + Vite frontend for the Keysha AI Productivity Engine.

## 🏗️ Architecture Overview

### Folder Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   └── layout/         # Layout components (sidebar, nav)
│   ├── contexts/           # React Context providers (Auth state)
│   ├── pages/              # Page components (routes)
│   ├── services/           # API service layer
│   │   ├── api.ts         # Axios client configuration
│   │   ├── authService.ts # Auth API calls
│   │   ├── itemService.ts # Items CRUD operations
│   │   └── aiService.ts   # AI chat API calls
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root component with routing
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json            # Vercel deployment config
```

### Key Concepts Explained

#### 1. **Service Layer Pattern**
Services (`src/services/`) handle all API communication. They're like "messengers" that know how to talk to the backend. Components never call APIs directly - they use services. This makes it easy to:
- Change API endpoints in one place
- Add error handling consistently
- Mock APIs for testing

#### 2. **Context for Global State**
`AuthContext` manages authentication state globally. Think of it as a "shared whiteboard" that any component can read from. When you log in, the context updates, and all components automatically re-render with the new user data.

#### 3. **Protected Routes**
`ProtectedRoute` component acts as a "bouncer" - it checks if you're authenticated before showing protected pages. If not, it redirects to login.

#### 4. **OAuth Flow (PKCE)**
1. User clicks "Sign in with Google" → `LoginPage`
2. Frontend calls backend `/auth/initiate` → Gets authorization URL + code verifier
3. User redirected to Google → Logs in
4. Google redirects to `/auth/callback?code=...` → `CallbackPage`
5. Frontend sends code + verifier to backend → Gets JWT token
6. Token stored in localStorage + AuthContext → User is logged in

**Why PKCE?** Security! The code verifier proves we're the same app that started the login. Prevents "authorization code interception" attacks.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001/auth
VITE_ITEM_SERVICE_URL=http://localhost:3001/items
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_ENV=development
```

**Important:** Google Client ID is **NOT needed in the frontend** - it's stored securely on the backend. The frontend only redirects to OAuth URLs provided by the backend.

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory.

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Vercel auto-detects Vite configuration
4. Add environment variables in Vercel dashboard
5. Deploy!

The `vercel.json` file configures:
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: All routes redirect to `index.html` (for React Router)

## 📚 Key Files Explained

### `src/services/api.ts`
Centralized HTTP client using Axios. Automatically:
- Adds JWT token to all requests
- Handles 401 errors (token expired) by logging out
- Transforms errors to consistent format

### `src/contexts/AuthContext.tsx`
Manages authentication state:
- Stores user and token
- Persists to localStorage
- Provides `login()`, `logout()`, `refreshAuth()` functions
- Any component can access via `useAuth()` hook

### `src/pages/LoginPage.tsx`
Initiates OAuth flow:
1. Calls backend to get authorization URL
2. Stores code verifier in sessionStorage
3. Redirects to Google

### `src/pages/CallbackPage.tsx`
Completes OAuth flow:
1. Extracts code from URL
2. Gets code verifier from sessionStorage
3. Exchanges code for JWT token
4. Stores token and redirects to dashboard

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Headless UI**: Accessible component primitives
- **Heroicons**: Icon library

Custom colors defined in `tailwind.config.js`:
- Primary: Blue shades (500-900)

## 🔒 Security Notes

1. **JWT Tokens**: Stored in localStorage (acceptable for MVP, consider httpOnly cookies for production)
2. **Environment Variables**: All API URLs and secrets in `.env` (never commit `.env`!)
3. **PKCE**: OAuth uses PKCE for security
4. **HTTPS**: Always use HTTPS in production (Vercel provides this automatically)

## 🧪 Testing (Future)

Structure is ready for testing:
- Services can be easily mocked
- Components are separated from business logic
- Context can be wrapped in test providers

## 📝 Next Steps

1. **Backend Integration**: Update `.env` with actual backend URLs
2. **Error Handling**: Add toast notifications for errors
3. **Loading States**: Enhance loading indicators
4. **Form Validation**: Add form validation library (e.g., Zod + React Hook Form)
5. **Item CRUD**: Complete the create/update/delete forms in `ItemsPage`
6. **AI Integration**: Connect chat to actual AI service

## 🎓 Learning Resources

- [React Router v6 Docs](https://reactrouter.com/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [OAuth 2.0 PKCE Flow](https://oauth.net/2/pkce/)
