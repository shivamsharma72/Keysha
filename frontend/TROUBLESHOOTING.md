# Troubleshooting Guide

## "Failed to initiate login" Error

### Why This Happens

This error occurs because the **backend auth service is not running**. The frontend is trying to make an API call to:

```
POST http://localhost:3001/auth/initiate
```

But since your backend Node.js service isn't running yet, the request fails with a network error.

### Understanding the Error

**What's happening:**
1. User clicks "Sign in with Google"
2. Frontend calls `authService.initiateOAuth()`
3. This makes a POST request to `http://localhost:3001/auth/initiate`
4. **Backend isn't running** → Connection refused
5. Error is caught and displayed

**The error message now shows:**
- "Cannot connect to backend server. Please ensure the auth service is running on http://localhost:3001"

### Solutions

#### Option 1: Start Your Backend (Recommended)

Once you've built your backend auth service:

1. Start your Node.js auth service on port 3001
2. Ensure it has the `/auth/initiate` endpoint
3. Try logging in again

#### Option 2: Test UI Without Backend

For now, you can:
- ✅ Navigate through all pages
- ✅ See the UI components
- ✅ Test routing
- ❌ Cannot test OAuth login (requires backend)

#### Option 3: Mock the Backend (Development Only)

If you want to test the frontend flow without a real backend, you can temporarily modify the service:

```typescript
// In authService.ts - TEMPORARY MOCK
export const initiateOAuth = async (): Promise<OAuthInitResponse> => {
  // Mock response for testing
  return {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=...',
    codeVerifier: 'mock_code_verifier'
  }
}
```

**⚠️ Warning:** This is only for UI testing. Real OAuth won't work without a proper backend.

### Checking Your Backend

To verify if your backend is running:

```bash
# Check if something is listening on port 3001
lsof -i :3001

# Or test the endpoint directly
curl http://localhost:3001/auth/initiate
```

### Common Issues

1. **Backend not started**
   - Solution: Start your Node.js auth service

2. **Wrong port**
   - Check your `.env` file: `VITE_AUTH_SERVICE_URL=http://localhost:3001/auth`
   - Ensure backend is running on the same port

3. **CORS errors**
   - Backend needs to allow requests from `http://localhost:3000`
   - Add CORS middleware in your backend

4. **Environment variables not loaded**
   - Restart the dev server after changing `.env`
   - Vite requires `VITE_` prefix for env variables

### Next Steps

1. **For now:** Test the UI, navigation, and component rendering
2. **When backend is ready:** Update `.env` with correct URLs and test OAuth flow
3. **For production:** Ensure backend is deployed and update environment variables

### Debugging Tips

1. **Check browser console** (F12) for detailed error messages
2. **Check Network tab** to see the failed API request
3. **Verify environment variables** are loaded correctly
4. **Check backend logs** if backend is running
