#!/bin/bash

# Define project root
PROJECT_ROOT="/home/yuvi/.gemini/antigravity/scratch/openbb_stat_software"

echo "Initializing THE TERMINAL..."

# Kill any existing processes on ports 8000 (Backend) and 3000 (Frontend)
fuser -k 8000/tcp > /dev/null 2>&1
fuser -k 3000/tcp > /dev/null 2>&1

# Start Backend
echo "Starting Neural Backend..."
cd "$PROJECT_ROOT"
python3 -m uvicorn backend.main:app --reload --port 8000 > /dev/null 2>&1 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Visual Interface..."
cd "$PROJECT_ROOT/frontend"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# Wait for services to spin up
sleep 5

# Open Dashboard
echo "Access Granted."
xdg-open http://localhost:3000 > /dev/null 2>&1

# Keep script running to maintain processes (optional, or just exit and let them run in bg)
# For a "terminal" feel, we might want to attach to logs or just exit.
# Let's exit and leave them running in background.
echo "System Online."
