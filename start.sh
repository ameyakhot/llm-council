#!/bin/bash

# LLM Council - Start script

echo "Starting LLM Council..."
echo ""

# Load nvm if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check Node.js version and try to use a compatible version
CURRENT_NODE=$(node --version 2>/dev/null)
NODE_MAJOR=$(echo "$CURRENT_NODE" | cut -d'v' -f2 | cut -d'.' -f1)

if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
    echo "Current Node.js version: ${CURRENT_NODE:-unknown}"
    echo "Vite 7 requires Node.js 20.19+ or 22.12+"
    
    # Try to use nvm to switch to a newer version
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        echo "Attempting to use a newer Node.js version via nvm..."
        # Try Node 22 first, then 20, then latest
        if nvm use 22 2>/dev/null || nvm use 20 2>/dev/null || nvm use node 2>/dev/null; then
            echo "Switched to Node.js $(node --version)"
        else
            echo "Error: Could not switch to a compatible Node.js version."
            echo "Please run: nvm install 22 && nvm use 22"
            exit 1
        fi
    else
        echo "Error: Node.js version is too old and nvm is not available."
        echo "Please upgrade Node.js to version 20.19+ or 22.12+"
        exit 1
    fi
else
    echo "Using Node.js $(node --version)"
fi

# Function to kill process on a port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Port $port is busy. Killing process $pid..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Kill processes on backend port (8001)
kill_port 8001

# Kill processes on frontend port (5173)
kill_port 5173

# Start backend
echo "Starting backend on http://localhost:8001..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

# Start frontend
echo "Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ LLM Council is running!"
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
