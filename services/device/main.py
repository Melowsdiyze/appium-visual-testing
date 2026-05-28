from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import sys
import os
import docker
import asyncio
import json


import sys
import os
# Explicitly add /app to sys.path to ensure shared module is found
# This is a workaround for Docker environment issues
if '/app' not in sys.path:
    sys.path.insert(0, '/app')

from shared.database import User, Device, DeviceStatus, get_db, AsyncSessionLocal
from sqlalchemy import select
import uuid

app = FastAPI(title="Device Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Docker client - lazy initialization
docker_client = None

def get_docker_client():
    """Lazy initialization of Docker client"""
    global docker_client
    if docker_client is None:
        docker_client = docker.DockerClient(base_url='unix:///var/run/docker.sock')
    return docker_client

# Active devices registry
active_devices: Dict[str, dict] = {}

# Models
class DeviceCreate(BaseModel):
    name: str
    device_type: str = "emulator"  # "emulator" or "real_device"
    device_model: str = "Pixel_4"
    android_version: str = "11.0"
    memory: Optional[str] = "4096"  # RAM in MB
    storage: Optional[str] = "8192"  # Storage in MB
    cpu_cores: Optional[str] = "2"  # Number of CPU cores
    adb_host: Optional[str] = None  # IP address for real device
    adb_port: Optional[str] = "5555"  # Port for ADB connection
    apk_path: Optional[str] = None
    app_package: Optional[str] = None
    app_activity: Optional[str] = None

class DeviceResponse(BaseModel):
    id: str
    name: str
    status: str
    appium_url: Optional[str]
    vnc_url: Optional[str]
    device_model: str
    created_at: str

    class Config:
        from_attributes = True

# Mock Auth (simplified for testing)
async def get_current_user_mock():
    """Mock user for testing - replace with real auth later"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.username == "cyberforce")
        )
        user = result.scalar_one_or_none()
        return user

# Routes
@app.get("/")
async def root():
    return {"service": "device-service", "status": "running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/create", response_model=DeviceResponse)
async def create_device(
    device_data: DeviceCreate,
    current_user: User = Depends(get_current_user_mock)
):
    """Create a new Android device (simplified version using Appium standalone)"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        # Create device record (allow multiple devices per user)
        device = Device(
            id=str(uuid.uuid4()),
            name=device_data.name,
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            device_model=device_data.device_model,
            android_version=device_data.android_version,
            apk_path=device_data.apk_path,
            app_package=device_data.app_package,
            app_activity=device_data.app_activity,
            status=DeviceStatus.CREATING
        )

        session.add(device)
        await session.commit()
        await session.refresh(device)

        # Start device creation in background with device creation data
        asyncio.create_task(create_device_containers(device.id, device_data))

        return DeviceResponse(
            id=device.id,
            name=device.name,
            status=device.status.value,
            appium_url=device.appium_url,
            vnc_url=device.vnc_url,
            device_model=device.device_model,
            created_at=device.created_at.isoformat()
        )

async def create_device_containers(device_id: str, device_data: DeviceCreate):
    """Background task to create Docker containers for device or connect to real device"""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Device).where(Device.id == device_id)
            )
            device = result.scalar_one()

            # Check device type
            if device_data.device_type == "real_device":
                # Handle real device connection via ADB
                await connect_real_device(device, device_data, session)
            else:
                # Create Android emulator container
                await create_emulator_container(device, device_data, session)

    except Exception as e:
        print(f"✗ Error creating device containers: {e}")


async def connect_real_device(device, device_data: DeviceCreate, session):
    """Connect to a real Android device via ADB"""
    try:
        import subprocess

        # Construct ADB connect command
        adb_target = f"{device_data.adb_host}:{device_data.adb_port}"

        # Try to connect to the device
        result = subprocess.run(
            ["adb", "connect", adb_target],
            capture_output=True,
            text=True,
            timeout=30
        )

        if "connected" in result.stdout.lower() or "already connected" in result.stdout.lower():
            # Successfully connected
            device.adb_port = int(device_data.adb_port)
            device.appium_url = None  # Real device doesn't have its own Appium server
            device.vnc_url = None  # Real device doesn't have VNC (would need scrcpy or similar)
            device.status = DeviceStatus.RUNNING

            await session.commit()

            print(f"✓ Connected to real device {device.name} at {adb_target}")
        else:
            raise Exception(f"Failed to connect to device: {result.stdout} {result.stderr}")

    except Exception as e:
        print(f"✗ Error connecting to real device: {e}")
        device.status = DeviceStatus.ERROR
        await session.commit()


async def create_emulator_container(device, device_data: DeviceCreate, session):
    """Create Android emulator container"""
    try:
        container_name = f"device_{device.user_id[:8]}_{device.name}"

        # Convert memory and CPU to appropriate formats
        memory_mb = int(device_data.memory) if device_data.memory else 4096
        storage_mb = int(device_data.storage) if device_data.storage else 8192
        cpu_count = int(device_data.cpu_cores) if device_data.cpu_cores else 2

        # Calculate memory limits
        mem_limit = f"{memory_mb}M"
        shm_size = f"{max(512, memory_mb // 2)}M"  # At least 512M, or half of RAM

        # Generate unique serial number for emulator
        import random
        serial_number = f"emulator-{random.randint(5556, 9999)}"

        # Use custom Android emulator with Google Play Store, GPU support, and web VNC
        container = get_docker_client().containers.run(
            image="android-android-web:latest",
            name=container_name,
            detach=True,
            privileged=True,
            tty=True,
            stdin_open=True,
            shm_size=shm_size,
            mem_limit=mem_limit,
            cpu_count=cpu_count,
            environment={
                "DISABLE_ANIMATION": "false",
                "DISABLE_HIDDEN_POLICY": "true",
                "SKIP_AUTH": "false",
                "MEMORY": str(memory_mb),
                "CORES": str(cpu_count),
                "DISPLAY": ":0",
                "VNC_PASSWORD": "android123",
                "EMULATOR_SERIAL": serial_number,
            },
            devices=[
                "/dev/kvm:/dev/kvm"  # KVM device for hardware acceleration
            ],
            ports={
                "5555/tcp": None,  # ADB
                "4723/tcp": None,  # Appium
                "6080/tcp": None,  # noVNC web interface
                "5900/tcp": None,  # VNC
            },
            volumes={
                "/home/jopan/android/keys/adbkey": {
                    "bind": "/root/.android/adbkey",
                    "mode": "ro"
                },
                "/home/jopan/android/keys/adbkey.pub": {
                    "bind": "/root/.android/adbkey.pub",
                    "mode": "ro"
                },
                f"/home/jopan/appium-visual-platform/data/devices/{device.user_id}": {
                    "bind": "/data",
                    "mode": "rw"
                }
            },
            extra_hosts={
                "host.docker.internal": "host-gateway"
            }
        )

        # Wait for container to be ready
        await asyncio.sleep(10)

        # Get exposed ports
        container.reload()
        ports = container.attrs['NetworkSettings']['Ports']

        adb_port = int(ports['5555/tcp'][0]['HostPort']) if ports.get('5555/tcp') else None
        appium_port = int(ports['4723/tcp'][0]['HostPort']) if ports.get('4723/tcp') else None
        vnc_port = int(ports['6080/tcp'][0]['HostPort']) if ports.get('6080/tcp') else None

        # Update device record
        device.emulator_container_id = container.id
        device.adb_port = adb_port
        device.appium_url = f"http://YOUR_SERVER_IP:{appium_port}" if appium_port else None
        device.vnc_url = f"http://YOUR_SERVER_IP:{vnc_port}" if vnc_port else None
        device.status = DeviceStatus.RUNNING

        await session.commit()

        # Store in active devices
        active_devices[device.id] = {
            "container_id": container.id,
            "appium_port": appium_port,
            "vnc_port": vnc_port,
            "adb_port": adb_port
        }

        print(f"✓ Device {device.name} created successfully with {memory_mb}MB RAM, {storage_mb}MB storage, {cpu_count} CPU cores")

    except docker.errors.APIError as e:
        print(f"✗ Docker error creating device: {e}")
        device.status = DeviceStatus.ERROR
        await session.commit()

@app.get("/list", response_model=list[DeviceResponse])
async def list_devices(current_user: User = Depends(get_current_user_mock)):
    """List all devices for current user"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.user_id == current_user.id)
        )
        devices = result.scalars().all()

        return [
            DeviceResponse(
                id=d.id,
                name=d.name,
                status=d.status.value,
                appium_url=d.appium_url,
                vnc_url=d.vnc_url,
                device_model=d.device_model,
                created_at=d.created_at.isoformat()
            )
            for d in devices
        ]

@app.delete("/{device_id}")
async def delete_device(
    device_id: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Delete a device"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Stop and remove container
        if device.emulator_container_id:
            try:
                container = get_docker_client().containers.get(device.emulator_container_id)
                container.stop(timeout=10)
                container.remove()
                print(f"✓ Container removed: {device.emulator_container_id}")
            except docker.errors.NotFound:
                print(f"Container not found: {device.emulator_container_id}")
            except Exception as e:
                print(f"Error removing container: {e}")

        # Remove from active devices
        if device_id in active_devices:
            del active_devices[device_id]

        # Delete from database
        await session.delete(device)
        await session.commit()

        return {"message": "Device deleted successfully"}

@app.get("/{device_id}/status")
async def get_device_status(
    device_id: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Get device status"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Check container status
        container_running = False
        if device.emulator_container_id:
            try:
                container = get_docker_client().containers.get(device.emulator_container_id)
                container_running = container.status == "running"
            except:
                pass

        return {
            "device_id": device.id,
            "name": device.name,
            "status": device.status.value,
            "container_running": container_running,
            "appium_url": device.appium_url,
            "vnc_url": device.vnc_url
        }

@app.get("/{device_id}/page-source")
async def get_page_source(
    device_id: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Get page source (XML hierarchy) for element inspection"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        if not device.appium_url:
            raise HTTPException(status_code=400, detail="Device Appium server not available")

        try:
            # Connect to Appium and get page source
            import requests
            response = requests.post(
                f"{device.appium_url}/session",
                json={
                    "capabilities": {
                        "alwaysMatch": {
                            "platformName": "Android",
                            "appium:automationName": "UiAutomator2",
                            "appium:deviceName": device.name
                        }
                    }
                },
                timeout=10
            )

            if response.status_code == 200:
                session_data = response.json()
                session_id = session_data.get("value", {}).get("sessionId")

                if session_id:
                    # Get page source
                    source_response = requests.get(
                        f"{device.appium_url}/session/{session_id}/source",
                        timeout=10
                    )

                    # Delete session
                    requests.delete(
                        f"{device.appium_url}/session/{session_id}",
                        timeout=5
                    )

                    if source_response.status_code == 200:
                        page_source = source_response.json().get("value", "")
                        return page_source

            raise HTTPException(status_code=500, detail="Failed to get page source from Appium")

        except Exception as e:
            print(f"Error getting page source: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/{device_id}/power")
async def control_power(
    device_id: str,
    action: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Control device power (power button press)"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        if not device.emulator_container_id:
            raise HTTPException(status_code=400, detail="Device container not found")

        try:
            container = get_docker_client().containers.get(device.emulator_container_id)

            if action == "press":
                # Press power button via ADB
                exec_result = container.exec_run("adb shell input keyevent 26")
                return {"message": "Power button pressed", "output": exec_result.output.decode()}
            elif action == "wake":
                # Wake up device
                exec_result = container.exec_run("adb shell input keyevent KEYCODE_WAKEUP")
                return {"message": "Device woke up", "output": exec_result.output.decode()}
            elif action == "sleep":
                # Put device to sleep
                exec_result = container.exec_run("adb shell input keyevent KEYCODE_SLEEP")
                return {"message": "Device went to sleep", "output": exec_result.output.decode()}
            else:
                raise HTTPException(status_code=400, detail="Invalid action. Use: press, wake, or sleep")

        except Exception as e:
            print(f"Error controlling power: {e}")
            raise HTTPException(status_code=500, detail=str(e))

class TextInput(BaseModel):
    text: str

class KeyEventInput(BaseModel):
    keycode: str  # e.g., "KEYCODE_ENTER", "KEYCODE_BACK", "66" (for enter)

@app.post("/{device_id}/input/text")
async def send_text_input(
    device_id: str,
    input_data: TextInput,
    current_user: User = Depends(get_current_user_mock)
):
    """Send text input to device via ADB"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        if not device.emulator_container_id:
            raise HTTPException(status_code=400, detail="Device container not found")

        try:
            container = get_docker_client().containers.get(device.emulator_container_id)

            # Escape special characters and send text via ADB
            # Replace spaces with %s for ADB input text command
            escaped_text = input_data.text.replace(' ', '%s').replace('&', '\\&').replace('(', '\\(').replace(')', '\\)')

            # Send text input
            exec_result = container.exec_run(f'adb shell input text "{escaped_text}"')

            return {
                "message": "Text sent successfully",
                "text": input_data.text,
                "output": exec_result.output.decode() if exec_result.output else ""
            }

        except Exception as e:
            print(f"Error sending text input: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/{device_id}/input/keyevent")
async def send_key_event(
    device_id: str,
    input_data: KeyEventInput,
    current_user: User = Depends(get_current_user_mock)
):
    """Send key event to device via ADB (e.g., Enter, Backspace, etc.)"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
        )
        device = result.scalar_one_or_none()

        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        if not device.emulator_container_id:
            raise HTTPException(status_code=400, detail="Device container not found")

        try:
            container = get_docker_client().containers.get(device.emulator_container_id)

            # Send key event
            exec_result = container.exec_run(f'adb shell input keyevent {input_data.keycode}')

            return {
                "message": "Key event sent successfully",
                "keycode": input_data.keycode,
                "output": exec_result.output.decode() if exec_result.output else ""
            }

        except Exception as e:
            print(f"Error sending key event: {e}")
            raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/devices/{device_id}/stream")
async def device_stream(websocket: WebSocket, device_id: str):
    """WebSocket endpoint for device streaming (placeholder)"""
    await websocket.accept()

    try:
        # This is a placeholder - real implementation would stream device screen
        await websocket.send_json({
            "type": "info",
            "message": "Device streaming coming soon. Use VNC URL for now."
        })

        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            await websocket.send_json({"echo": data})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for device {device_id}")

@app.post("/adb/connect")
async def adb_connect(
    ip_address: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user_mock)
):
    """Connect to physical device via ADB"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # Try to connect using subprocess (more reliable in container)
        import subprocess
        result = subprocess.run(
            ["adb", "connect", ip_address],
            capture_output=True,
            text=True,
            timeout=10
        )

        output = result.stdout + result.stderr

        if "connected" in output.lower() or "already connected" in output.lower():
            return {
                "message": f"Successfully connected to {ip_address}",
                "output": output,
                "success": True
            }
        else:
            return {
                "message": f"Failed to connect to {ip_address}",
                "output": output,
                "success": False
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADB connect error: {str(e)}")

@app.get("/adb/devices")
async def adb_list_devices(current_user: User = Depends(get_current_user_mock)):
    """List all ADB connected devices"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        import subprocess
        result = subprocess.run(
            ["adb", "devices", "-l"],
            capture_output=True,
            text=True,
            timeout=5
        )

        lines = result.stdout.strip().split('\n')[1:]  # Skip first line "List of devices attached"
        devices = []

        for line in lines:
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    device_id = parts[0]
                    status = parts[1]

                    # Get device info
                    model = "Unknown"
                    try:
                        model_result = subprocess.run(
                            ["adb", "-s", device_id, "shell", "getprop", "ro.product.model"],
                            capture_output=True,
                            text=True,
                            timeout=3
                        )
                        model = model_result.stdout.strip() or "Unknown"
                    except:
                        pass

                    devices.append({
                        "device_id": device_id,
                        "status": status,
                        "model": model,
                        "type": "physical" if ":" in device_id else "emulator"
                    })

        return {"devices": devices}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ADB devices error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
