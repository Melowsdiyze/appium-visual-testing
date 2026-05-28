#!/bin/bash

# Fix all dockerfile paths in docker-compose.yml
sed -i '/executor-service:/,/dockerfile:/ s|dockerfile: Dockerfile|dockerfile: services/executor/Dockerfile|' docker-compose.yml
sed -i '/scheduler-service:/,/dockerfile:/ s|dockerfile: Dockerfile|dockerfile: services/scheduler/Dockerfile|' docker-compose.yml
sed -i '/ai-service:/,/dockerfile:/ s|dockerfile: Dockerfile|dockerfile: services/ai_assistant/Dockerfile|' docker-compose.yml
sed -i '/notification-service:/,/dockerfile:/ s|dockerfile: Dockerfile|dockerfile: services/notification/Dockerfile|' docker-compose.yml
sed -i '/frontend:/,/dockerfile:/ s|dockerfile: Dockerfile|dockerfile: frontend/Dockerfile|' docker-compose.yml

echo "Dockerfile paths fixed"
