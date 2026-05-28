FROM python:3.11-slim

WORKDIR /app

# Install Docker CLI
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://get.docker.com -o get-docker.sh && \
    sh get-docker.sh && \
    rm get-docker.sh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy and install requirements first
COPY services/codegen/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app

# Copy shared module FIRST
COPY shared/ ./shared/

# Copy application code (symlink will be ignored)
COPY services/codegen/*.py ./

# Create templates directory
RUN mkdir -p templates

# Run as root to access Docker socket
# RUN useradd -m -u 1000 appium && chown -R appium:appium /app
# USER appium

EXPOSE 8000

CMD ["bash", "-c", "PYTHONPATH=/app uvicorn main:app --host 0.0.0.0 --port 8000"]
