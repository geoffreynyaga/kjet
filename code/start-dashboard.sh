#!/bin/bash

# KJET Statistics Dashboard Launcher
echo "🚀 Starting KJET Statistics Dashboard..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the React app directory."
    echo "   cd /Users/geoff/Downloads/KJET/src"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start the development server
echo "🌐 Starting development server..."
echo "📊 Dashboard will be available at: http://localhost:3000"
npm start