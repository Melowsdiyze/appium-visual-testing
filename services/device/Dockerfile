FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK Platform Tools (contains adb)
RUN wget https://dl.google.com/android/repository/platform-tools-latest-linux.zip -O /tmp/platform-tools.zip \
    && unzip /tmp/platform-tools.zip -d /opt \
    && rm /tmp/platform-tools.zip \
    && chmod +x /opt/platform-tools/adb

ENV PATH="/opt/platform-tools:${PATH}"

# Copy and install requirements first
COPY services/device/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app

# Copy shared module FIRST
COPY shared/ ./shared/

# Copy application code (symlink will be ignored)
COPY services/device/*.py ./

# Run as root to access Docker socket
# RUN useradd -m -u 1000 appium && chown -R appium:appium /app
# USER appium

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)" || exit 1

CMD ["bash", "-c", "PYTHONPATH=/app uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1"]
