#!/bin/bash

echo "================================================"
echo "Rebuilding Failed Services"
echo "================================================"
echo ""

# Stop failed services first
echo "Stopping services..."
docker-compose stop auth-service device-service codegen-service 2>/dev/null || true
echo ""

# Rebuild with no cache
echo "Rebuilding services (this may take a few minutes)..."
docker-compose build --no-cache auth-service device-service codegen-service

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Rebuild successful!"
    echo ""
    echo "Starting services..."
    docker-compose up -d auth-service device-service codegen-service
    echo ""
    echo "Waiting for services to start (10 seconds)..."
    sleep 10
    echo ""
    echo "Checking service status..."
    docker-compose ps auth-service device-service codegen-service
    echo ""
    echo "================================================"
    echo "Services rebuilt and started!"
    echo "================================================"
    echo ""
    echo "Test the services:"
    echo "  - Auth:    curl http://localhost:8001/health"
    echo "  - Device:  curl http://localhost:8003/health"
    echo "  - CodeGen: curl http://localhost:8005/health"
    echo ""
    echo "Access web UI: http://YOUR_SERVER_IP:9678"
    echo ""
else
    echo ""
    echo "✗ Rebuild failed!"
    echo ""
    echo "Check logs:"
    echo "  docker-compose logs auth-service"
    echo "  docker-compose logs device-service"
    echo "  docker-compose logs codegen-service"
    echo ""
fi
