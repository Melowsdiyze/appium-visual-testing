#!/bin/bash

echo "================================================"
echo "Appium Visual Platform - Setup Verification"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

ERRORS=0

# Check Docker
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    check_pass "Docker is installed"

    if docker ps &> /dev/null; then
        check_pass "Docker is accessible (no permission issues)"
    else
        check_fail "Docker permission denied - Run: sudo usermod -aG docker \$USER && newgrp docker"
        ERRORS=$((ERRORS + 1))
    fi
else
    check_fail "Docker is not installed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check Docker Compose
echo "Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    check_pass "Docker Compose is installed"
else
    check_fail "Docker Compose is not installed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check required files
echo "Checking required files..."
FILES=("docker-compose.yml" ".env" "install.sh" "shared/database.py" "frontend/package.json")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file is missing"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check services
echo "Checking service structure..."
SERVICES=("auth" "device" "codegen" "workspace" "recording" "executor" "scheduler" "ai_assistant" "notification")
for service in "${SERVICES[@]}"; do
    if [ -f "services/$service/main.py" ] && [ -f "services/$service/Dockerfile" ]; then
        check_pass "Service $service is ready"
    else
        check_fail "Service $service is incomplete"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check frontend
echo "Checking frontend..."
if [ -f "frontend/src/App.jsx" ] && [ -f "frontend/Dockerfile" ]; then
    check_pass "Frontend is ready"
else
    check_fail "Frontend is incomplete"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check if services are running
echo "Checking running services..."
if docker ps &> /dev/null; then
    RUNNING=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
    if [ "$RUNNING" -gt 0 ]; then
        check_pass "$RUNNING services are running"
        echo ""
        echo "Running services:"
        docker-compose ps --format "table {{.Name}}\t{{.Status}}"
    else
        check_warn "No services are running yet - run ./install.sh to start"
    fi
else
    check_warn "Cannot check running services (Docker permission issue)"
fi
echo ""

# Summary
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    if [ "$RUNNING" -eq 0 ] || [ -z "$RUNNING" ]; then
        echo "Next step: Run ./install.sh to start the platform"
    else
        echo "Platform is ready!"
        echo "Access at: http://YOUR_SERVER_IP:9678"
    fi
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
fi
echo "================================================"
