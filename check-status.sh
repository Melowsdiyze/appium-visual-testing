#!/bin/bash

echo "================================================"
echo "Platform Status Check"
echo "================================================"
echo ""

echo "Checking Docker access..."
if docker ps >/dev/null 2>&1; then
    echo "✓ Docker is accessible"
else
    echo "✗ Docker permission denied"
    echo "  Run: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi
echo ""

echo "Checking containers..."
echo ""
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | head -20
echo ""

echo "Checking service health..."
echo ""

# Check infrastructure
echo "Infrastructure Services:"
check_port() {
    port=$1
    name=$2
    result=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>&1)
    if [ "$result" = "200" ]; then
        echo "  ✓ $name (port $port)"
    else
        echo "  ✗ $name (port $port) - Not responding"
    fi
}

# Check backend services
echo ""
echo "Backend Services:"
check_port 8001 "Auth Service"
check_port 8002 "Workspace Service"
check_port 8003 "Device Service"
check_port 8004 "Recording Service"
check_port 8005 "CodeGen Service"
check_port 8006 "Executor Service"
check_port 8007 "Scheduler Service"
check_port 8008 "AI Service"
check_port 8009 "Notification Service"

# Check frontend
echo ""
echo "Frontend:"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://YOUR_SERVER_IP:9678 2>&1)
if [ "$frontend_status" = "200" ] || [ "$frontend_status" = "304" ]; then
    echo "  ✓ Web UI (http://YOUR_SERVER_IP:9678)"
else
    echo "  ✗ Web UI - Not accessible"
fi

echo ""
echo "================================================"
echo ""
echo "Quick Actions:"
echo "  - View logs:     docker-compose logs -f [service-name]"
echo "  - Rebuild:       ./rebuild.sh"
echo "  - Restart all:   docker-compose restart"
echo "  - Stop all:      docker-compose down"
echo ""
