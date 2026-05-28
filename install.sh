#!/bin/bash

set -e

echo "============================================"
echo "Appium Visual Test Platform - Installation"
echo "============================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "✗ Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Create required directories
echo "Creating directory structure..."
mkdir -p data/{workspaces,devices,uploads,backups}
mkdir -p logs
echo "✓ Directories created"
echo ""

# Pull required Docker images
echo "Pulling Docker images (this may take a while)..."
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull mongo:6
docker pull rabbitmq:3-management-alpine
docker pull minio/minio:latest
docker pull nginx:alpine
docker pull budtmo/docker-android:emulator_11.0
echo "✓ Base images pulled"
echo ""

# Build application services
echo "Building application services..."
docker-compose build --parallel
echo "✓ Services built"
echo ""

# Start infrastructure services first
echo "Starting infrastructure services..."
docker-compose up -d postgres redis mongodb rabbitmq minio
echo "Waiting for infrastructure to be ready (30 seconds)..."
sleep 30
echo "✓ Infrastructure services started"
echo ""

# Start application services
echo "Starting application services..."
docker-compose up -d
echo "Waiting for all services to be ready (20 seconds)..."
sleep 20
echo "✓ All services started"
echo ""

# Check service health
echo "Checking service health..."
docker-compose ps
echo ""

# Display access information
echo "============================================"
echo "Installation Complete!"
echo "============================================"
echo ""
echo "🌐 Access the platform at: http://YOUR_SERVER_IP:9678"
echo ""
echo "📋 Default credentials:"
echo "   Username: cyberforce"
echo "   Password: YOUR_APP_PASSWORD"
echo ""
echo "⚠️  IMPORTANT: Change the default password after first login!"
echo ""
echo "📊 Service URLs:"
echo "   - Web UI: http://YOUR_SERVER_IP:9678"
echo "   - MinIO Console: http://YOUR_SERVER_IP:9001"
echo "   - RabbitMQ Management: http://YOUR_SERVER_IP:15672"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f [service-name]"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Check status: docker-compose ps"
echo ""
echo "🚀 Platform is ready for testing!"
echo ""
