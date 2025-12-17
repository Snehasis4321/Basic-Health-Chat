# Healthcare Chat Platform - Backend

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (running locally)
- Redis 6+ (running locally)
- pnpm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration (especially OPENAI_API_KEY)
```

3. Ensure PostgreSQL and Redis are running locally

4. Create PostgreSQL database (if not exists):
```bash
createdb healthcare_chat
```

5. Run database migrations:
```bash
pnpm run migrate
```

### Development

Start the development server:
```bash
pnpm run dev
```

The server will run on http://localhost:3001

### Build

Build for production:
```bash
pnpm run build
```

### Testing

Run tests:
```bash
pnpm test
```

## Project Structure

```
src/
├── config/          # Configuration files (database, redis)
├── db/              # Database schema and migrations
├── services/        # Business logic services
├── routes/          # API routes
├── middleware/      # Express middleware
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point
```

## API Endpoints

### Health Check
- `GET /health` - Check server and service health

## Environment Variables

See `.env.example` for all available configuration options.
