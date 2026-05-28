#!/bin/bash

echo "🚀 Rebuilding Frontend with Modern UI..."

cd /home/jopan/appium-visual-platform

echo "📦 Building frontend image..."
docker compose build --no-cache frontend

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    echo "🔄 Restarting frontend..."
    docker compose up -d frontend

    echo "📋 Checking frontend logs..."
    sleep 3
    docker compose logs frontend --tail=30

    echo ""
    echo "✅ Frontend rebuilt successfully!"
    echo "🌐 Access: http://YOUR_SERVER_IP:9678"
    echo ""
    echo "Press Ctrl+Shift+R in browser to clear cache"
else
    echo "❌ Build failed! Check errors above"
    exit 1
fi
