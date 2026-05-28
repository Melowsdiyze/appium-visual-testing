from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, Text, JSON, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from datetime import datetime
import enum
import os
import uuid

Base = declarative_base()

# Enums
class UserRole(enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    USER = "user"

class ExecutionStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ERROR = "error"

class DeviceStatus(enum.Enum):
    CREATING = "creating"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"

# Models
class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.USER)

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True)
    created_by = Column(String(36), nullable=True)

    workspace = relationship("Workspace", back_populates="users", foreign_keys=[workspace_id])
    scripts = relationship("Script", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    owner_id = Column(String(36), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    storage_path = Column(String(500), nullable=False)

    users = relationship("User", back_populates="workspace", foreign_keys=[User.workspace_id])
    scripts = relationship("Script", back_populates="workspace", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="workspace", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)

    device_model = Column(String(100), default="Pixel_4")
    android_version = Column(String(20), default="11.0")
    screen_resolution = Column(String(50), default="1080x1920")

    emulator_container_id = Column(String(100), nullable=True)
    appium_container_id = Column(String(100), nullable=True)

    adb_port = Column(Integer, nullable=True)
    appium_url = Column(String(255), nullable=True)
    vnc_url = Column(String(255), nullable=True)

    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.CREATING)

    apk_path = Column(String(500), nullable=True)
    app_package = Column(String(255), nullable=True)
    app_activity = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="devices")
    workspace = relationship("Workspace", back_populates="devices")
    scripts = relationship("Script", back_populates="device")

class Script(Base):
    __tablename__ = "scripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    device_id = Column(String(36), ForeignKey("devices.id"), nullable=True)

    code = Column(Text, nullable=False)
    language = Column(String(20), default="python")

    config = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    is_favorite = Column(Boolean, default=False)

    run_count = Column(Integer, default=0)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="scripts")
    workspace = relationship("Workspace", back_populates="scripts")
    device = relationship("Device", back_populates="scripts")
    executions = relationship("Execution", back_populates="script", cascade="all, delete-orphan")

class Execution(Base):
    __tablename__ = "executions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), nullable=False, index=True)

    script_id = Column(String(36), ForeignKey("scripts.id"), nullable=True)
    device_id = Column(String(36), ForeignKey("devices.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    status = Column(SQLEnum(ExecutionStatus), default=ExecutionStatus.PENDING)

    script_name = Column(String(255), nullable=True)
    device_name = Column(String(255), nullable=True)

    log_file = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    script = relationship("Script", back_populates="executions")
    device = relationship("Device")
    user = relationship("User")

# Database Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://appium_user:changeme123@postgres/appium_platform"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    """Initialize database schema"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create default owner
    async with AsyncSessionLocal() as session:
        from passlib.context import CryptContext
        from sqlalchemy import select

        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        # Check if owner exists
        result = await session.execute(
            select(User).where(User.username == "cyberforce")
        )
        existing_owner = result.scalar_one_or_none()

        if not existing_owner:
            # Create owner workspace
            workspace = Workspace(
                id=str(uuid.uuid4()),
                name="Owner Workspace",
                owner_id="system",
                storage_path="/data/workspaces/owner"
            )
            session.add(workspace)
            await session.flush()

            # Create owner user
            owner = User(
                id=str(uuid.uuid4()),
                username="cyberforce",
                password_hash=pwd_context.hash("YOUR_APP_PASSWORD"),
                role=UserRole.OWNER,
                workspace_id=workspace.id,
                is_active=True
            )
            session.add(owner)
            await session.commit()

            print("✓ Default owner created: cyberforce / YOUR_APP_PASSWORD")
        else:
            print("✓ Owner user already exists")

async def get_db():
    """Dependency for FastAPI"""
    async with AsyncSessionLocal() as session:
        yield session
