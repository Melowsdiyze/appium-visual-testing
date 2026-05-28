#!/bin/bash

# Create stub services for workspace, recording, executor, scheduler, ai, notification

SERVICES=("workspace" "recording" "executor" "scheduler" "ai_assistant" "notification")

for SERVICE in "${SERVICES[@]}"; do
    echo "Creating stub service: $SERVICE"
    
    # Create main.py
    cat > services/$SERVICE/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SERVICE_NAME", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"service": "SERVICE_NAME", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

    # Replace SERVICE_NAME
    sed -i "s/SERVICE_NAME/$SERVICE/g" services/$SERVICE/main.py
    
    # Create Dockerfile
    cat > services/$SERVICE/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

    # Create requirements.txt if not exists
    if [ ! -f "services/$SERVICE/requirements.txt" ]; then
        cat > services/$SERVICE/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
EOF
    fi
    
done

echo "All stub services created!"
