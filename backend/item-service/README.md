# Keysha Item Service

CRUD service for Actions, Reminders, and Events - the core productivity items in Keysha.

## 🎯 What This Service Does

Handles all operations for three item types:
- **Actions** - Tasks with duration and optional due dates
- **Reminders** - Time-based notifications
- **Events** - Calendar events with start/end times (syncs with Google Calendar)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend/item-service
npm install
```

### 2. Configure Environment
```bash
cp env.template .env
```

Edit `.env`:
- `MONGODB_URI` - Same as auth-service
- `JWT_SECRET` - Same as auth-service (for token verification)
- `PORT=3002` - Different port from auth-service

### 3. Start Server
```bash
npm run dev
```

Server runs on `http://localhost:3002`

## 📡 API Endpoints

All endpoints require JWT authentication (Bearer token in Authorization header).

- `GET /items` - Get all items for user
- `GET /items/calendar?start=...&end=...` - Get items for date range
- `GET /items/:id` - Get single item
- `POST /items` - Create new item
- `PATCH /items/:id` - Update item
- `DELETE /items/:id` - Delete item
- `POST /items/:id/complete` - Toggle completion status

## 🏗️ Architecture

- **Independent Service** - Deployable separately to Lambda
- **Shared Database** - Uses same MongoDB as auth-service
- **JWT Verification** - Verifies tokens from auth-service
- **Google Calendar Sync** - Events sync with Google Calendar (TODO: requires OAuth tokens)

## 📝 Item Schema

See `src/models/Item.ts` for full schema. Key fields:
- Common: title, description, location, subtasks, executionMode, priority, category
- Action: duration, dueDate
- Reminder: reminderTime
- Event: startDate, endDate, googleCalendarId

## 🔄 Next Steps

1. Implement Google Calendar sync (requires fetching OAuth tokens)
2. Add webhook endpoint for Google Calendar push notifications
3. Add drag-and-drop reordering
4. Deploy to AWS Lambda
