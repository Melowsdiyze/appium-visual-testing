#!/bin/bash

echo "================================================"
echo "Rebuilding Failed Services (FIXED VERSION)"
echo "================================================"
echo ""

echo "Issue Fixed:"
echo "  - Symlink collision resolved"
echo "  - Updated .dockerignore"
echo "  - Updated Dockerfiles to copy only .py files"
echo ""

# Stop failed services
echo "Stopping failed services..."
docker compose stop auth-service device-service codegen-service 2>/dev/null || true
echo ""

# Remove old containers
echo "Removing old containers..."
docker compose rm -f auth-service device-service codegen-service 2>/dev/null || true
echo ""

# Rebuild with no cache
echo "Rebuilding services (this may take 2-5 minutes)..."
echo ""
docker compose build --no-cache --progress=plain auth-service device-service codegen-service

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✓ Rebuild successful!"
    echo "================================================"
    echo ""
    echo "Starting services..."
    docker compose up -d auth-service device-service codegen-service
    echo ""
    echo "Waiting for services to initialize (15 seconds)..."
    sleep 15
    echo ""
    echo "Checking service status..."
    echo ""
    docker compose ps auth-service device-service codegen-service
    echo ""
    echo "================================================"
    echo "Testing service health..."
    echo "================================================"
    echo ""

    # Test each service
    for port in 8001 8003 8005; do
        result=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>&1)
        service=""
        if [ "$port" = "8001" ]; then service="Auth Service"; fi
        if [ "$port" = "8003" ]; then service="Device Service"; fi
        if [ "$port" = "8005" ]; then service="CodeGen Service"; fi

        if [ "$result" = "200" ]; then
            echo "✓ $service (port $port) - Healthy"
        else
            echo "✗ $service (port $port) - Not responding (may still be starting)"
        fi
    done

    echo ""
    echo "================================================"
    echo "✅ ALL DONE!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Check all services: docker-compose ps"
    echo "  2. View logs: docker-compose logs -f [service-name]"
    echo "  3. Access web UI: http://YOUR_SERVER_IP:9678"
    echo "  4. Login: cyberforce / YOUR_APP_PASSWORD"
    echo ""
else
    echo ""
    echo "================================================"
    echo "✗ Rebuild failed!"
    echo "================================================"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Docker has enough resources (RAM, disk)"
    echo "  2. View build logs above for specific errors"
    echo "  3. Try full rebuild: docker compose down && docker compose up -d --build"
    echo ""
    echo "View logs:"
    echo "  docker compose logs auth-service"
    echo "  docker compose logs device-service"
    echo "  docker compose logs codegen-service"
    echo ""
fi
