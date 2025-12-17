# Healthcare Chat Platform

A secure, real-time healthcare communication platform with multilingual support, enabling anonymous patients to consult with authenticated doctors through text and audio messaging.

## Features

- **Anonymous Patient Access**: Patients can create consultation rooms without registration
- **Doctor Authentication**: Secure JWT-based authentication for healthcare providers
- **End-to-End Encryption**: Messages encrypted with room-specific cipher keys
- **Real-time Communication**: WebSocket-based instant messaging
- **Multilingual Support**: AI-powered translation using OpenAI
- **Text-to-Speech**: Audio playback of messages in preferred language
- **Speech-to-Text**: Voice message support
- **Chat History**: Persistent transcripts with lazy loading
- **Responsive Design**: Works on web and mobile devices

## Tech Stack

### Frontend
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Socket.io Client

### Backend
- Node.js with Express
- TypeScript
- Socket.io Server
- PostgreSQL (with connection pooling)
- Redis (for caching)
- OpenAI API (translation, TTS, STT)

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 14+ (running locally)
- Redis 6+ (running locally)
- OpenAI API key

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
pnpm install

# Install frontend dependencies
cd ../frontend
pnpm install
```

Or use the setup script:
```bash
./setup.sh
```

### 2. Configure Environment

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration (especially OPENAI_API_KEY)
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Edit if needed (defaults should work for local development)
```

### 3. Ensure Services are Running

Make sure PostgreSQL and Redis are running on your local machine:
- PostgreSQL on port 5432
- Redis on port 6379

### 4. Run Database Migrations

```bash
cd backend
pnpm run migrate
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
pnpm run dev
# Server runs on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
pnpm run dev
# App runs on http://localhost:3000
```

## Project Structure

```
.
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Database and Redis configuration
│   │   ├── db/             # Database schema and migrations
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Application entry point
│   └── package.json
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   └── package.json
├── setup.sh               # Setup script
└── readme.md
```

## API Endpoints

### Health Check
- `GET /health` - Check server and service health

### Authentication (Coming Soon)
- `POST /api/auth/register` - Doctor registration
- `POST /api/auth/login` - Doctor login
- `GET /api/auth/validate` - Validate JWT token

### Rooms (Coming Soon)
- `POST /api/rooms` - Create patient room
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms/:roomId/join` - Doctor joins room

### Messages (Coming Soon)
- `GET /api/rooms/:roomId/messages` - Get message history

## WebSocket Events

### Client to Server
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `send_message` - Send a text message
- `request_tts` - Request audio playback
- `audio_chunk` - Stream audio for STT

### Server to Client
- `room_joined` - Room join confirmation
- `user_joined` - User joined notification
- `user_left` - User left notification
- `new_message` - Incoming message
- `message_translated` - Translated message
- `audio_stream` - TTS audio data
- `error` - Error notifications

## Database Schema

### Tables
- `doctors` - Doctor accounts with authentication
- `rooms` - Chat rooms with cipher keys
- `messages` - Message history with encryption

See `backend/src/db/schema.sql` for complete schema.

## Development

### Backend Commands
```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm test         # Run tests
pnpm run migrate  # Run database migrations
```

### Frontend Commands
```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run lint     # Run linter
```

## Testing

```bash
# Backend tests
cd backend
pnpm test

# Frontend tests (coming soon)
cd frontend
pnpm test
```

## Environment Variables

See `.env.example` files in backend and frontend directories for all available configuration options.

## License

ISC
