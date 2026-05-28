from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional


import sys
import os
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
import asyncio
import logging

# Explicitly add /app to sys.path to ensure shared module is found
# This is a workaround for Docker environment issues
if '/app' not in sys.path:
    sys.path.insert(0, '/app')

from shared.database import User, Script, Device, Execution, ExecutionStatus, get_db, AsyncSessionLocal
from sqlalchemy import select
import uuid

app = FastAPI(title="CodeGen Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
os.makedirs(template_dir, exist_ok=True)
jinja_env = Environment(loader=FileSystemLoader(template_dir))

# Models
class CodeGenStep(BaseModel):
    action: str  # click, input, swipe, verify
    xpath: str
    caption: str
    text: Optional[str] = None
    timeout: int = 10

class CodeGenRequest(BaseModel):
    name: str
    device_id: str
    steps: List[CodeGenStep]
    app_package: Optional[str] = None
    app_activity: Optional[str] = None
    telegram_bot_token_1: Optional[str] = None
    telegram_chat_id_1: Optional[str] = None
    telegram_thread_id_1: Optional[str] = None

class ScriptResponse(BaseModel):
    id: str
    name: str
    code: str
    created_at: str

class ScriptCreate(BaseModel):
    name: str
    language: str
    code: str
    environment: Optional[str] = "default"
    devices: Optional[List[str]] = []
    schedule: Optional[Dict] = None

class EnvironmentCreate(BaseModel):
    name: str
    requirements: str

class EnvironmentResponse(BaseModel):
    name: str
    requirements: str

class RunScriptRequest(BaseModel):
    language: str
    code: str
    environment: str
    devices: List[str]

# Mock Auth
async def get_current_user_mock():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.username == "cyberforce")
        )
        return result.scalar_one_or_none()

# Routes
@app.get("/")
async def root():
    return {"service": "codegen-service", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/generate", response_model=ScriptResponse)
async def generate_code(
    request: CodeGenRequest,
    current_user: User = Depends(get_current_user_mock)
):
    """Generate Appium Python script from recorded steps"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Generate code using template
    code = generate_python_script(request)

    # Save to database
    async with AsyncSessionLocal() as session:
        script = Script(
            id=str(uuid.uuid4()),
            name=request.name,
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            device_id=request.device_id,
            code=code,
            language="python",
            config={
                "app_package": request.app_package,
                "app_activity": request.app_activity,
                "telegram": {
                    "bot_token_1": request.telegram_bot_token_1,
                    "chat_id_1": request.telegram_chat_id_1,
                    "thread_id_1": request.telegram_thread_id_1
                }
            }
        )

        session.add(script)
        await session.commit()
        await session.refresh(script)

        return ScriptResponse(
            id=script.id,
            name=script.name,
            code=script.code,
            created_at=script.created_at.isoformat()
        )

def generate_python_script(request: CodeGenRequest) -> str:
    """Generate Python Appium script"""

    template_content = '''"""
Generated Appium Test Script
Name: {{ name }}
Generated at: {{ timestamp }}
"""

import time
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime

def wait_and_click(driver, xpath, caption, timeout=10):
    """Wait for element and click"""
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Attempting: {caption}")
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((AppiumBy.XPATH, xpath))
        )
        element.click()
        time.sleep(1)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ SUCCESS: {caption}")
        return True
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ FAILED: {caption} - {str(e)}")
        return False

def wait_and_input(driver, xpath, text, caption, timeout=10):
    """Wait for input field and enter text"""
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Attempting: {caption}")
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((AppiumBy.XPATH, xpath))
        )
        element.send_keys(text)
        time.sleep(1)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ SUCCESS: {caption}")
        return True
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✗ FAILED: {caption} - {str(e)}")
        return False

def main():
    print("="*60)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 STARTING TEST: {{ name }}")
    print("="*60)

    # Configure Appium
    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.device_name = "Android Emulator"
    {% if app_package %}
    options.app_package = "{{ app_package }}"
    options.app_activity = "{{ app_activity }}"
    {% endif %}
    options.automation_name = "UiAutomator2"
    options.no_reset = True

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Connecting to Appium Server...")
    driver = webdriver.Remote("http://localhost:4723", options=options)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Connected successfully")

    try:
        time.sleep(3)  # Wait for app to load

        # Generated test steps
        {% for step in steps %}
        {% if step.action == "click" %}
        wait_and_click(driver, "{{ step.xpath }}", "{{ step.caption }}", {{ step.timeout }})
        {% elif step.action == "input" %}
        wait_and_input(driver, "{{ step.xpath }}", "{{ step.text }}", "{{ step.caption }}", {{ step.timeout }})
        {% endif %}
        {% endfor %}

        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ TEST COMPLETED SUCCESSFULLY")

    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ CRITICAL ERROR: {str(e)}")
    finally:
        driver.quit()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Test finished")

if __name__ == "__main__":
    main()
'''

    template = jinja_env.from_string(template_content)

    code = template.render(
        name=request.name,
        timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        app_package=request.app_package,
        app_activity=request.app_activity,
        steps=[step.dict() for step in request.steps]
    )

    return code

@app.get("/scripts", response_model=List[ScriptResponse])
async def list_scripts(current_user: User = Depends(get_current_user_mock)):
    """List all scripts for current user"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Script).where(Script.user_id == current_user.id)
        )
        scripts = result.scalars().all()

        return [
            ScriptResponse(
                id=s.id,
                name=s.name,
                code=s.code,
                created_at=s.created_at.isoformat()
            )
            for s in scripts
        ]

@app.get("/scripts/{script_id}")
async def get_script(
    script_id: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Get script by ID"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Script).where(Script.id == script_id, Script.user_id == current_user.id)
        )
        script = result.scalar_one_or_none()

        if not script:
            raise HTTPException(status_code=404, detail="Script not found")

        return ScriptResponse(
            id=script.id,
            name=script.name,
            code=script.code,
            created_at=script.created_at.isoformat()
        )

@app.post("/scripts", response_model=ScriptResponse)
async def create_script(
    script_data: ScriptCreate,
    current_user: User = Depends(get_current_user_mock)
):
    """Create a new script manually"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        script = Script(
            id=str(uuid.uuid4()),
            name=script_data.name,
            user_id=current_user.id,
            workspace_id=current_user.workspace_id,
            code=script_data.code,
            language=script_data.language,
            config={
                "environment": script_data.environment,
                "devices": script_data.devices,
                "schedule": script_data.schedule
            }
        )

        session.add(script)
        await session.commit()
        await session.refresh(script)

        return ScriptResponse(
            id=script.id,
            name=script.name,
            code=script.code,
            created_at=script.created_at.isoformat()
        )

@app.put("/scripts/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: str,
    script_data: ScriptCreate,
    current_user: User = Depends(get_current_user_mock)
):
    """Update an existing script"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Script).where(Script.id == script_id, Script.user_id == current_user.id)
        )
        script = result.scalar_one_or_none()

        if not script:
            raise HTTPException(status_code=404, detail="Script not found")

        # Update script fields
        script.name = script_data.name
        script.code = script_data.code
        script.language = script_data.language
        script.config = {
            "environment": script_data.environment,
            "devices": script_data.devices,
            "schedule": script_data.schedule
        }

        await session.commit()
        await session.refresh(script)

        return ScriptResponse(
            id=script.id,
            name=script.name,
            code=script.code,
            created_at=script.created_at.isoformat()
        )

# In-memory environment storage (replace with database in production)
environments_store = [
    {"name": "default", "requirements": "appium-python-client\nselenium"}
]

@app.get("/environments", response_model=List[EnvironmentResponse])
async def list_environments(current_user: User = Depends(get_current_user_mock)):
    """List all environments"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return [EnvironmentResponse(**env) for env in environments_store]

@app.post("/environments", response_model=EnvironmentResponse)
async def create_environment(
    env_data: EnvironmentCreate,
    current_user: User = Depends(get_current_user_mock)
):
    """Create a new environment and install packages"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if environment already exists
    if any(env["name"] == env_data.name for env in environments_store):
        raise HTTPException(status_code=400, detail="Environment already exists")

    new_env = {
        "name": env_data.name,
        "requirements": env_data.requirements,
        "status": "installing",
        "installed_packages": []
    }
    environments_store.append(new_env)

    # Install packages in background
    asyncio.create_task(install_packages(env_data.name, env_data.requirements))

    return EnvironmentResponse(
        name=new_env["name"],
        requirements=new_env["requirements"]
    )

async def install_packages(env_name: str, requirements: str):
    """Background task to install packages"""
    import subprocess

    # Find environment in store
    env = next((e for e in environments_store if e["name"] == env_name), None)
    if not env:
        return

    try:
        # Parse requirements
        packages = [line.strip() for line in requirements.split('\n') if line.strip() and not line.startswith('#')]

        for package in packages:
            try:
                # Simulate installation (in production, use real pip install)
                # subprocess.run(['pip', 'install', package], check=True)

                # For now, just simulate
                await asyncio.sleep(0.5)  # Simulate installation time

                if "installed_packages" not in env:
                    env["installed_packages"] = []
                env["installed_packages"].append(package)

            except Exception as e:
                print(f"Error installing {package}: {e}")

        env["status"] = "ready"

    except Exception as e:
        print(f"Error installing packages: {e}")
        env["status"] = "error"

@app.get("/environments/{env_name}/status")
async def get_environment_status(
    env_name: str,
    current_user: User = Depends(get_current_user_mock)
):
    """Get environment installation status"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    env = next((e for e in environments_store if e["name"] == env_name), None)

    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    return {
        "name": env["name"],
        "status": env.get("status", "ready"),
        "installed_packages": env.get("installed_packages", []),
        "total_packages": len([line for line in env["requirements"].split('\n') if line.strip() and not line.startswith('#')])
    }

def adjust_script_for_container(code: str, device_name: str) -> str:
    """Auto-adjust script for container environment"""
    import re

    # Replace device_name with emulator-5554
    code = re.sub(
        r'options\.device_name\s*=\s*["\'][^"\']+["\']',
        'options.device_name = "emulator-5554"',
        code
    )

    # Comment out app path (app biasanya sudah installed)
    code = re.sub(
        r'(\s+options\.app\s*=.*)',
        r'    # \1  # App already installed in container',
        code
    )

    # Replace Appium server URL to localhost:4723
    code = re.sub(
        r'webdriver\.Remote\(["\']http://[^"\']+["\']',
        'webdriver.Remote("http://localhost:4723"',
        code
    )

    return code

@app.post("/run")
async def run_script(
    run_data: RunScriptRequest,
    current_user: User = Depends(get_current_user_mock)
):
    """Run a script on selected devices"""

    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    job_id = str(uuid.uuid4())
    results = []

    import subprocess
    import tempfile
    import os
    import logging

    logger = logging.getLogger(__name__)

    async with AsyncSessionLocal() as session:
        for device_id in run_data.devices:
            try:
                # Get device info
                result = await session.execute(
                    select(Device).where(Device.id == device_id)
                )
                device = result.scalar_one_or_none()

                if not device or not device.emulator_container_id:
                    logger.error(f"Device {device_id} not found or no container")
                    results.append({
                        "device_id": device_id,
                        "status": "error",
                        "message": "Device container not found"
                    })
                    continue

                container_id = device.emulator_container_id
                script_filename = f"/tmp/script_{job_id}_{device_id[:8]}.py"
                log_filename = f"/tmp/script_output_{job_id}_{device_id[:8]}.log"

                logger.info(f"Running script on device {device.name} (container: {container_id[:12]})")

                # Auto-adjust script for container
                adjusted_code = adjust_script_for_container(run_data.code, device.name)

                # Write script to temp file
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py') as f:
                    f.write(adjusted_code)
                    temp_script_path = f.name

                logger.info(f"Created temp script at {temp_script_path}")

                # Copy to container
                cp_result = subprocess.run(
                    ["docker", "cp", temp_script_path, f"{container_id}:{script_filename}"],
                    capture_output=True,
                    text=True
                )

                if cp_result.returncode != 0:
                    logger.error(f"Failed to copy script: {cp_result.stderr}")
                    raise Exception(f"Failed to copy script to container: {cp_result.stderr}")

                logger.info(f"Copied script to container: {script_filename}")
                os.unlink(temp_script_path)

                # Install dependencies in background (don't wait)
                dep_result = subprocess.run(
                    ["docker", "exec", container_id, "pip3", "install", "--quiet",
                     "appium-python-client", "selenium", "requests", "reportlab", "pillow"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if dep_result.returncode != 0:
                    logger.warning(f"Dependency install warning: {dep_result.stderr}")

                # Execute script in background - use nohup to ensure it continues
                exec_cmd = f"nohup python3 {script_filename} > {log_filename} 2>&1 &"
                exec_result = subprocess.run(
                    ["docker", "exec", "-d", container_id, "bash", "-c", exec_cmd],
                    capture_output=True,
                    text=True
                )

                if exec_result.returncode != 0:
                    logger.error(f"Failed to execute script: {exec_result.stderr}")
                    raise Exception(f"Failed to execute script: {exec_result.stderr}")

                logger.info(f"Started script execution, log: {log_filename}")

                # Save execution to DB
                execution = Execution(
                    id=str(uuid.uuid4()),
                    job_id=job_id,
                    script_id=None,
                    device_id=device_id,
                    user_id=current_user.id,
                    status=ExecutionStatus.RUNNING,
                    script_name=f"Script_{job_id[:8]}",
                    device_name=device.name,
                    log_file=log_filename
                )
                session.add(execution)

                results.append({
                    "device_id": device_id,
                    "device_name": device.name,
                    "execution_id": execution.id,
                    "status": "running",
                    "message": "Script execution started",
                    "log_file": log_filename
                })

            except Exception as e:
                logger.error(f"Error running script on device {device_id}: {str(e)}")
                results.append({
                    "device_id": device_id,
                    "status": "error",
                    "message": str(e)
                })

        await session.commit()

    return {
        "message": "Script execution started",
        "job_id": job_id,
        "results": results
    }

@app.get("/executions")
async def list_executions(current_user: User = Depends(get_current_user_mock)):
    """List all script executions"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Execution).where(Execution.user_id == current_user.id).order_by(Execution.started_at.desc())
        )
        executions = result.scalars().all()

        return [{
            "id": e.id,
            "job_id": e.job_id,
            "script_name": e.script_name,
            "device_name": e.device_name,
            "status": e.status.value,
            "started_at": e.started_at.isoformat() if e.started_at else None,
            "finished_at": e.finished_at.isoformat() if e.finished_at else None,
            "error_message": e.error_message
        } for e in executions]

@app.get("/executions/{execution_id}/logs")
async def get_execution_logs(execution_id: str, current_user: User = Depends(get_current_user_mock)):
    """Get logs for a specific execution"""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Execution).where(Execution.id == execution_id)
        )
        execution = result.scalar_one_or_none()

        if not execution:
            raise HTTPException(status_code=404, detail="Execution not found")

        # Get device to find container
        device_result = await session.execute(
            select(Device).where(Device.id == execution.device_id)
        )
        device = device_result.scalar_one_or_none()

        if not device or not device.emulator_container_id:
            return {"logs": "Container not found"}

        # Read logs from container
        import subprocess
        try:
            result = subprocess.run(
                ["docker", "exec", device.emulator_container_id, "cat", execution.log_file],
                capture_output=True,
                text=True,
                timeout=5
            )
            logs = result.stdout if result.returncode == 0 else (result.stderr or "Log file not found or empty")

            # Also update execution status based on log content
            if result.returncode == 0 and logs:
                await update_execution_status(session, execution, logs)

            return {"logs": logs}
        except subprocess.TimeoutExpired:
            return {"logs": "Timeout reading logs"}
        except Exception as e:
            return {"logs": f"Error reading logs: {str(e)}"}

async def update_execution_status(session, execution: Execution, logs: str):
    """Update execution status based on log content"""
    if execution.status == ExecutionStatus.RUNNING:
        # Check if execution finished
        if "TEST COMPLETED SUCCESSFULLY" in logs or "✅" in logs:
            execution.status = ExecutionStatus.SUCCESS
            execution.finished_at = datetime.utcnow()
        elif "CRITICAL ERROR" in logs or "❌" in logs or "Traceback" in logs:
            execution.status = ExecutionStatus.FAILED
            execution.finished_at = datetime.utcnow()
            # Extract error message
            lines = logs.split('\n')
            for line in lines:
                if "ERROR" in line or "Traceback" in line:
                    execution.error_message = line[:500]
                    break

        await session.commit()

# Background task to monitor running executions
async def monitor_executions():
    """Background task to monitor and update execution status"""
    logger = logging.getLogger(__name__)

    while True:
        try:
            await asyncio.sleep(10)  # Check every 10 seconds

            async with AsyncSessionLocal() as session:
                # Get all running executions
                result = await session.execute(
                    select(Execution).where(
                        Execution.status.in_([ExecutionStatus.RUNNING, ExecutionStatus.PENDING])
                    )
                )
                running_executions = result.scalars().all()

                if not running_executions:
                    continue

                logger.info(f"Monitoring {len(running_executions)} running executions")

                for execution in running_executions:
                    try:
                        # Get device
                        device_result = await session.execute(
                            select(Device).where(Device.id == execution.device_id)
                        )
                        device = device_result.scalar_one_or_none()

                        if not device or not device.emulator_container_id:
                            continue

                        # Read logs
                        import subprocess
                        result = subprocess.run(
                            ["docker", "exec", device.emulator_container_id, "cat", execution.log_file],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )

                        if result.returncode == 0:
                            logs = result.stdout
                            await update_execution_status(session, execution, logs)

                    except Exception as e:
                        logger.error(f"Error monitoring execution {execution.id}: {str(e)}")

        except Exception as e:
            logger.error(f"Error in monitor_executions: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup"""
    logger = logging.getLogger(__name__)
    logger.info("Starting background monitoring task")
    asyncio.create_task(monitor_executions())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
