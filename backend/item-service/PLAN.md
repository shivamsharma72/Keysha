# Item Service Implementation Plan

## 🎯 Service Overview

The Item Service handles all CRUD operations for **Actions**, **Reminders**, and **Events** - the three core productivity item types in Keysha.

## 📋 Requirements from Screenshots

### Item Types
1. **ACTION** - Tasks with duration
2. **REMINDER** - Time-based notifications
3. **EVENT** - Calendar events with start/end times

### Item Fields (from screenshots)

**Common Fields:**
- `title` (string, required) - "Enter task title..."
- `description` (string, optional) - "Describe your task here..."
- `location` (string, optional) - "No location provided"
- `subtasks` (array of strings, optional) - "User Label" tags
- `executionMode` (enum: "Focus" | "Flow" | "Admin", default: "Flow")
- `priority` (enum: "One" | "Two" | "Three", default: "Two")
- `category` (enum: "Work" | "Personal" | "Health", default: "Personal")
- `completed` (boolean, default: false)
- `userId` (ObjectId, required) - from JWT token

**Type-Specific Fields:**

**ACTION:**
- `duration` (number, minutes) - "Enter Duration"
- `dueDate` (Date, optional) - "Select Date & Time"

**REMINDER:**
- `reminderTime` (Date, required) - "Select time" + "Select date"

**EVENT:**
- `startDate` (Date, required) - "Select Start Date & Time"
- `endDate` (Date, required) - "Select End Date & Time"
- `googleCalendarId` (string, optional) - for Google Calendar sync

## 🏗️ Architecture

### Database Schema (MongoDB)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,           // Reference to User
  type: 'action' | 'reminder' | 'event',
  
  // Common fields
  title: string,
  description?: string,
  location?: string,
  subtasks?: string[],
  executionMode: 'Focus' | 'Flow' | 'Admin',
  priority: 'One' | 'Two' | 'Three',
  category: 'Work' | 'Personal' | 'Health',
  completed: boolean,
  
  // Type-specific fields (only one set will be populated)
  duration?: number,          // ACTION: minutes
  dueDate?: Date,             // ACTION: optional due date
  
  reminderTime?: Date,        // REMINDER: when to remind
  
  startDate?: Date,           // EVENT: start time
  endDate?: Date,             // EVENT: end time
  googleCalendarId?: string,  // EVENT: Google Calendar sync
  
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/items` | Get all items for user | ✅ |
| GET | `/items/:id` | Get single item | ✅ |
| POST | `/items` | Create new item | ✅ |
| PATCH | `/items/:id` | Update item (syncs with Google Calendar) | ✅ |
| DELETE | `/items/:id` | Delete item | ✅ |
| POST | `/items/:id/complete` | Mark item as complete | ✅ |
| GET | `/items/calendar` | Get items for calendar view (date range) | ✅ |

### Google Calendar Integration

When an **EVENT** is created/updated:
1. Create/update event in Google Calendar via API
2. Store `googleCalendarId` in MongoDB
3. On delete, also delete from Google Calendar

**Webhook Endpoint:**
- `POST /webhooks/google` - Receives push notifications from Google when calendar events change externally

## 🔄 Data Flow

### Create Item Flow
```
Frontend → POST /items { type, title, ... }
Backend:
  1. Validate request (Zod schema)
  2. Extract userId from JWT
  3. Create item in MongoDB
  4. If type === 'event':
     - Create Google Calendar event
     - Store googleCalendarId
  5. Return created item
```

### Update Item Flow
```
Frontend → PATCH /items/:id { title, ... }
Backend:
  1. Validate request
  2. Update MongoDB
  3. If type === 'event' && has googleCalendarId:
     - Update Google Calendar event
  4. Return updated item
```

### Calendar View Flow
```
Frontend → GET /items/calendar?start=2024-01-01&end=2024-01-31
Backend:
  1. Get userId from JWT
  2. Query MongoDB for items in date range
  3. Group by date
  4. Return structured data for calendar view
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas (same as auth-service)
- **Validation**: Zod
- **Google APIs**: googleapis (Calendar API)
- **Auth**: JWT verification (reuse auth middleware pattern)

## 📁 Project Structure

```
backend/item-service/
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB connection
│   │   └── googleCalendar.ts    # Google Calendar client
│   ├── models/
│   │   └── Item.ts              # Mongoose schema
│   ├── services/
│   │   ├── itemService.ts       # Business logic
│   │   └── calendarService.ts   # Google Calendar operations
│   ├── middleware/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   └── error.middleware.ts  # Error handling
│   ├── routes/
│   │   └── items.routes.ts      # API endpoints
│   ├── utils/
│   │   └── logger.ts            # Logging
│   └── index.ts                 # Express app
├── .env.example
├── package.json
└── tsconfig.json
```

## 🔐 Security

1. **JWT Verification**: All endpoints require valid JWT
2. **User Isolation**: Users can only access their own items
3. **Input Validation**: Zod schemas for all requests
4. **Google Calendar**: Uses OAuth tokens from auth-service (stored per user)

## 🚀 Deployment

- **Local**: Runs on port 3002
- **Lambda**: Stateless design, ready for serverless
- **Environment**: Independent from auth-service

## 📝 Next Steps

1. Create project structure
2. Implement Item model
3. Create CRUD endpoints
4. Add Google Calendar sync
5. Add webhook endpoint
6. Test with frontend
