# 🚀 Appium Visual Test Platform

A comprehensive web-based platform for visual Appium script building and mobile testing automation.

## Features

- ✅ **User Management & RBAC**: Owner, Admin, and User roles with workspace isolation
- 📱 **Device Management**: Docker-based Android emulators with Appium integration
- 🎬 **Visual Recording**: Real-time interaction capture and XPath generation
- 💻 **Code Generation**: Automatic Python Appium script generation
- ⚡ **Test Execution**: Manual and scheduled test execution
- 📊 **Reporting**: Comprehensive test reports with screenshots
- 🤖 **AI Assistant**: Ollama-powered help and code optimization

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- 8GB+ RAM available
- 50GB+ disk space

### Installation

```bash
cd appium-visual-platform
./install.sh
```

### Access

- **Web UI**: http://YOUR_SERVER_IP:9678
- **Default Login**:
  - Username: `cyberforce`
  - Password: `YOUR_APP_PASSWORD`

## Architecture

```
Frontend (React) → Nginx → Microservices → Databases
                              ↓
                     Docker Containers
                    (Android Emulators)
```

## Services

- **Auth Service**: Authentication & authorization (Port 8001)
- **Device Service**: Device management (Port 8003)
- **CodeGen Service**: Script generation (Port 8005)
- **Workspace Service**: Workspace management (Port 8002)
- **Recording Service**: Interaction capture (Port 8004)
- **Executor Service**: Test execution (Port 8006)
- **Scheduler Service**: Cron scheduler (Port 8007)
- **AI Service**: AI assistance (Port 8008)
- **Notification Service**: Notifications (Port 8009)

## Infrastructure

- **PostgreSQL**: Main database
- **MongoDB**: Logs storage
- **Redis**: Caching & session management
- **RabbitMQ**: Message queue
- **MinIO**: Object storage
- **Nginx**: API Gateway & Load Balancer

## Usage

### 1. Create a Device

1. Login to web UI
2. Go to "Devices" tab
3. Click "Create Device"
4. Fill in device details
5. Wait for device to be ready (~2-3 minutes)

### 2. Create a Test Script

1. Go to "Scripts" tab
2. Click "Create Script"
3. Select your device
4. Add test steps (click, input, etc.)
5. Click "Generate Script"

### 3. View Scripts

1. Go to "Scripts" tab
2. Click on a script to view code
3. Download or run the script

## Management Commands

```bash
# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Check service status
docker-compose ps

# Remove all data (careful!)
docker-compose down -v
```

## Monitoring

- **Logs**: `docker-compose logs -f`
- **MinIO Console**: http://YOUR_SERVER_IP:9001
- **RabbitMQ Management**: http://YOUR_SERVER_IP:15672

## Security

- Change default password immediately
- Use strong JWT secret in production
- Enable HTTPS in production
- Regular security updates

## Troubleshooting

### Device creation fails
- Check Docker has enough resources
- Verify Docker daemon is running
- Check logs: `docker-compose logs device-service`

### Cannot login
- Verify auth-service is running
- Check database connection
- Reset password via database

### Service won't start
- Check port conflicts
- Verify .env file exists
- Review service logs

## Development

### Project Structure

```
├── services/          # Microservices
│   ├── auth/         # Authentication
│   ├── device/       # Device management
│   ├── codegen/      # Code generation
│   └── ...
├── frontend/         # React frontend
├── shared/           # Shared database models
├── nginx/            # Nginx configuration
└── docker-compose.yml
```

### Adding a New Service

1. Create service directory in `services/`
2. Add Dockerfile and requirements.txt
3. Implement FastAPI application
4. Add to docker-compose.yml
5. Add to nginx routing

## License

Proprietary - All Rights Reserved

## Support

For issues and questions, contact the development team.

---

**Version**: 1.0.0
**Last Updated**: 2024
