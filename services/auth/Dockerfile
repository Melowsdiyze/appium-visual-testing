FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements first (for caching)
COPY services/auth/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app

# Copy shared module FIRST
COPY shared/ ./shared/

# Copy application code (symlink will be ignored by .dockerignore)
COPY services/auth/*.py ./

# Create non-root user
RUN useradd -m -u 1000 appium && chown -R appium:appium /app
USER appium

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["bash", "-c", "PYTHONPATH=/app uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1"]
