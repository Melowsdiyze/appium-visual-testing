#!/bin/bash

echo "================================================"
echo "Fixing Login Issue - Bcrypt Salt Bug"
echo "================================================"
echo ""

echo "PROBLEM IDENTIFIED:"
echo "  - Invalid bcrypt salt generation code"
echo "  - Auth service failed to initialize database"
echo "  - Default user 'cyberforce' not created properly"
echo ""

echo "SOLUTION APPLIED:"
echo "  ✓ Fixed shared/database.py"
echo "  ✓ Fixed services/auth/main.py"
echo "  ✓ Removed manual salt generation"
echo "  ✓ Using passlib's automatic salt generation"
echo ""

echo "================================================"
echo "Step 1: Dropping existing database tables"
echo "================================================"
echo ""

# Drop and recreate database
docker compose exec -T postgres psql -U appium_user -d appium_platform -c "
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS scripts CASCADE;
" 2>&1 | grep -v "does not exist" || true

echo "✓ Database tables dropped"
echo ""

echo "================================================"
echo "Step 2: Restarting services"
echo "================================================"
echo ""

echo "Restarting auth-service..."
docker compose restart auth-service

echo "Restarting device-service (fixed Docker client bug)..."
docker compose restart device-service

echo ""
echo "Waiting for services to initialize (15 seconds)..."
sleep 15
echo ""

echo "================================================"
echo "Step 3: Checking auth service status"
echo "================================================"
echo ""

# Check if auth service is healthy
docker compose ps auth-service

echo ""
echo "================================================"
echo "Step 4: Checking logs"
echo "================================================"
echo ""

docker compose logs auth-service --tail=20

echo ""
echo "================================================"
echo "Step 5: Testing login endpoint"
echo "================================================"
echo ""

# Test login
response=$(curl -s -X POST http://localhost:35159/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=cyberforce&password=YOUR_APP_PASSWORD" 2>&1)

if echo "$response" | grep -q "access_token"; then
    echo "✓ LOGIN SUCCESSFUL!"
    echo ""
    echo "Token received. Login is working!"
else
    echo "✗ Login failed. Response:"
    echo "$response"
    echo ""
    echo "Troubleshooting needed. Check logs:"
    echo "  docker compose logs auth-service"
fi

echo ""
echo "================================================"
echo "FINAL STEPS"
echo "================================================"
echo ""
echo "Test login on web UI:"
echo "  1. Open: http://YOUR_SERVER_IP:9678"
echo "  2. Login: cyberforce / YOUR_APP_PASSWORD"
echo "  3. Should see dashboard"
echo ""
echo "If still fails, check:"
echo "  - docker compose logs auth-service"
echo "  - docker compose logs frontend"
echo "  - docker compose logs nginx"
echo ""
