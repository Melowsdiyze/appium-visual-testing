FROM ubuntu:22.04

# Docker labels
LABEL maintainer "Appium Visual Platform"
LABEL description "Android emulator with Appium and VNC for visual testing"
ENV DEBIAN_FRONTEND noninteractive

# Installing required packages including VNC and Appium dependencies
RUN apt update -y && \
  apt install -y --no-install-recommends \
  bash \
  unzip \
  wget \
  curl \
  ca-certificates \
  gnupg \
  libvirt-daemon \
  dbus \
  openjdk-18-jre-headless \
  virt-manager \
  libvulkan1 \
  xvfb \
  libgl1-mesa-glx \
  libgl1-mesa-dri \
  socat \
  htop \
  iproute2 \
  x11vnc \
  fluxbox \
  net-tools \
  supervisor \
  python3-pip && \
  rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS from NodeSource
RUN mkdir -p /etc/apt/keyrings && \
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
  apt update && \
  apt install -y nodejs && \
  rm -rf /var/lib/apt/lists/*

# Install Appium 3.x and websockify for web VNC
RUN npm install -g appium@next && \
    appium driver install uiautomator2 && \
    pip3 install websockify

# Arguments for Android SDK
ARG API_LEVEL=34
ARG IMG_TYPE=google_apis_playstore
ARG ARCHITECTURE=x86_64
ARG CMD_LINE_VERSION=11076708_latest
ARG DEVICE_ID=pixel_6_pro
ARG GPU_ACCELERATED=false

# Environment variables
ENV ANDROID_SDK_ROOT=/opt/android \
  ANDROID_PLATFORM_VERSION="platforms;android-$API_LEVEL" \
  PACKAGE_PATH="system-images;android-${API_LEVEL};${IMG_TYPE};${ARCHITECTURE}" \
  API_LEVEL=$API_LEVEL \
  DEVICE_ID=$DEVICE_ID \
  ARCHITECTURE=$ARCHITECTURE \
  ABI=${IMG_TYPE}/${ARCHITECTURE} \
  GPU_ACCELERATED=$GPU_ACCELERATED \
  QTWEBENGINE_DISABLE_SANDBOX=1 \
  ANDROID_EMULATOR_WAIT_TIME_BEFORE_KILL=10 \
  ANDROID_AVD_HOME=/data

# Exporting environment variables
ENV PATH "${PATH}:${ANDROID_SDK_ROOT}/platform-tools"
ENV PATH "${PATH}:${ANDROID_SDK_ROOT}/emulator"
ENV PATH "${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/tools/bin"
ENV LD_LIBRARY_PATH "$ANDROID_SDK_ROOT/emulator/lib64:$ANDROID_SDK_ROOT/emulator/lib64/qt/lib"

# Set the working directory
WORKDIR /opt

# Expose ports
EXPOSE 5554 5555 4723 6080

# Initialize directories
RUN mkdir -p /root/.android/ && \
  touch /root/.android/repositories.cfg && \
  mkdir -p /data

# Download and install Android SDK
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-${CMD_LINE_VERSION}_latest.zip -O /tmp/cmdline-tools.zip && \
  mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
  unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && \
  mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/tools && \
  rm /tmp/cmdline-tools.zip

# Accept licenses and install SDK components
RUN yes | sdkmanager --licenses && \
  sdkmanager --update && \
  sdkmanager \
    "platform-tools" \
    "platforms;android-${API_LEVEL}" \
    "${PACKAGE_PATH}" \
    "emulator" \
    "build-tools;34.0.0"

# Install noVNC for web-based VNC access
RUN cd /usr/share && \
  wget -q https://github.com/novnc/noVNC/archive/refs/tags/v1.4.0.tar.gz -O novnc.tar.gz && \
  tar -xzf novnc.tar.gz && \
  mv noVNC-1.4.0 novnc && \
  rm novnc.tar.gz && \
  ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Start ADB server\n\
echo "Starting ADB server..."\n\
adb -a -P 5037 server nodaemon &\n\
\n\
# Detect IP and forward ports\n\
LOCAL_IP=$(ip addr list eth0 | grep "inet " | cut -d'"'"' '"'"' -f6 | cut -d/ -f1)\n\
socat tcp-listen:5554,bind="$LOCAL_IP",fork tcp:127.0.0.1:5554 &\n\
socat tcp-listen:5555,bind="$LOCAL_IP",fork tcp:127.0.0.1:5555 &\n\
\n\
export USER=root\n\
\n\
# Create AVD if not exists\n\
TEST_AVD=$(avdmanager list avd | grep -c "android.avd" || true)\n\
if [ "$TEST_AVD" != "1" ]; then\n\
  echo "Creating Android Virtual Device..."\n\
  echo "Package: $PACKAGE_PATH"\n\
  echo "Device: $DEVICE_ID"\n\
  echo no | avdmanager create avd \\\n\
    --force \\\n\
    --name android \\\n\
    --abi "$ABI" \\\n\
    --package "$PACKAGE_PATH" \\\n\
    --device "$DEVICE_ID"\n\
  \n\
  # Enable Google Play Services\n\
  echo "hw.keyboard=yes" >> /data/android.avd/config.ini\n\
  echo "PlayStore.enabled=true" >> /data/android.avd/config.ini\n\
fi\n\
\n\
# Set GPU mode and start VNC\n\
export DISPLAY=":0.0"\n\
if [ "$GPU_ACCELERATED" == "true" ]; then\n\
  export GPU_MODE="host"\n\
else\n\
  export GPU_MODE="swiftshader_indirect"\n\
fi\n\
\n\
# Start Xvfb, window manager, and VNC\n\
Xvfb "$DISPLAY" -screen 0 1920x1080x24 -ac -nolisten tcp &\n\
sleep 2\n\
fluxbox -display "$DISPLAY" &\n\
sleep 1\n\
x11vnc -display "$DISPLAY" -forever -shared -rfbport 5900 -bg -nopw\n\
sleep 1\n\
websockify --web=/usr/share/novnc 6080 localhost:5900 &\n\
\n\
# Get memory and cores from environment or defaults\n\
OPT_MEMORY=${MEMORY:-4096}\n\
OPT_CORES=${CORES:-2}\n\
\n\
# Start emulator\n\
echo "Starting Android Emulator..."\n\
echo "Memory: ${OPT_MEMORY}MB"\n\
echo "Cores: ${OPT_CORES}"\n\
echo "GPU: ${GPU_MODE}"\n\
emulator \\\n\
  -avd android \\\n\
  -gpu "$GPU_MODE" \\\n\
  -memory $OPT_MEMORY \\\n\
  -cores $OPT_CORES \\\n\
  -no-boot-anim \\\n\
  -no-snapshot \\\n\
  -skip-adb-auth \\\n\
  -ranchu &\n\
\n\
EMULATOR_PID=$!\n\
\n\
# Wait for emulator to boot\n\
echo "Waiting for emulator to boot..."\n\
timeout=600\n\
elapsed=0\n\
while [ $elapsed -lt $timeout ]; do\n\
  boot_completed=$(adb shell getprop sys.boot_completed 2>/dev/null || echo "0")\n\
  if [ "$boot_completed" == "1" ]; then\n\
    echo "✓ Emulator booted successfully"\n\
    break\n\
  fi\n\
  sleep 5\n\
  elapsed=$((elapsed + 5))\n\
  echo "Waiting... ${elapsed}s / ${timeout}s"\n\
done\n\
\n\
# Start Appium server\n\
echo "Starting Appium server..."\n\
appium --address 0.0.0.0 --port 4723 --relaxed-security &\n\
\n\
# Wait for emulator process\n\
wait $EMULATOR_PID\n\
' > /opt/start.sh && chmod +x /opt/start.sh

# Set entrypoint
CMD ["/opt/start.sh"]
