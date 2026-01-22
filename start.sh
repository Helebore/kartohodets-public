#!/bin/bash

echo "🎮 Starting Kartohodets MP..."

# Kill any existing process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Install Python dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo "Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Activate venv and run
cd backend
source venv/bin/activate
python app.py