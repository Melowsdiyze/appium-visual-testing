#!/bin/bash

set -e  # Exit on error

echo "🚀 ============================================"
echo "🚀 APPIUM VISUAL PLATFORM - PRODUCTION DEPLOY"
echo "🚀 ============================================"
echo ""

cd /home/jopan/appium-visual-platform

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Step 1: Building Frontend with Modern UI...${NC}"
docker compose build --no-cache frontend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful!${NC}"
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📦 Step 2: Rebuilding Backend Services...${NC}"
docker compose build auth-service device-service
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend services built!${NC}"
else
    echo -e "${RED}❌ Backend build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Step 3: Restarting All Services...${NC}"
docker compose up -d

echo ""
echo -e "${BLUE}⏳ Step 4: Waiting for services to be ready...${NC}"
sleep 10

echo ""
echo -e "${BLUE}📋 Step 5: Checking Service Status...${NC}"
docker compose ps

echo ""
echo -e "${BLUE}🏥 Step 6: Health Check...${NC}"

# Check auth service
AUTH_STATUS=$(docker compose ps auth-service --format json | grep -o '"Health":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "unknown")
echo "Auth Service: $AUTH_STATUS"

# Check device service
DEVICE_STATUS=$(docker compose ps device-service --format json | grep -o '"Health":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "unknown")
echo "Device Service: $DEVICE_STATUS"

# Check frontend
FRONTEND_STATUS=$(docker compose ps frontend --format json | grep -o '"State":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "unknown")
echo "Frontend: $FRONTEND_STATUS"

echo ""
echo -e "${GREEN}✅ ============================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}✅ ============================================${NC}"
echo ""
echo -e "${YELLOW}📊 Access Points:${NC}"
echo -e "   🌐 Web UI:      ${BLUE}http://YOUR_SERVER_IP:9678${NC}"
echo -e "   🔐 Login:       ${BLUE}cyberforce / YOUR_APP_PASSWORD${NC}"
echo -e "   📱 Devices:     ${BLUE}http://YOUR_SERVER_IP:9678/dashboard/devices${NC}"
echo -e "   📝 Scripts:     ${BLUE}http://YOUR_SERVER_IP:9678/dashboard/scripts${NC}"
echo ""
echo -e "${YELLOW}⚡ Features:${NC}"
echo -e "   ✅ Modern Dark UI with Tailwind CSS"
echo -e "   ✅ Device Management with VNC Viewer"
echo -e "   ✅ Power Controls (Wake/Power/Sleep)"
echo -e "   ✅ Script Editor with Code Highlighting"
echo -e "   ✅ Element Inspector (Katalon-like)"
echo -e "   ✅ Test Execution"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "   1. Open browser: ${BLUE}http://YOUR_SERVER_IP:9678${NC}"
echo -e "   2. Login with: ${BLUE}cyberforce / YOUR_APP_PASSWORD${NC}"
echo -e "   3. ${YELLOW}IMPORTANT:${NC} Press ${BLUE}Ctrl+Shift+R${NC} to clear browser cache!"
echo -e "   4. Create a new device (wait 5-10 min for emulator boot)"
echo -e "   5. Create and run test scripts"
echo ""
echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
echo -e "   View logs: ${BLUE}docker compose logs -f [service-name]${NC}"
echo -e "   Restart:   ${BLUE}docker compose restart [service-name]${NC}"
echo -e "   Status:    ${BLUE}docker compose ps${NC}"
echo ""
echo -e "${GREEN}🎉 Ready for Production!${NC}"
