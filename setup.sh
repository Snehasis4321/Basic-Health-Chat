#!/bin/bash

echo "🏥 Healthcare Chat Platform - Setup Script"
echo "=========================================="
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pnpm install
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
pnpm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
cd backend
pnpm run migrate
cd ..
echo "✅ Database schema created"
echo ""

echo "=========================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL and Redis are running locally"
echo "2. Edit backend/.env if needed (default connects to localhost)"
echo "3. Add your OPENAI_API_KEY to backend/.env"
echo "4. Start the backend: cd backend && pnpm run dev"
echo "5. Start the frontend: cd frontend && pnpm run dev"
echo ""
echo "Backend will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000"
echo "=========================================="
