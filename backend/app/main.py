# app/main.py
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, text
from app.auth.routes import router as auth_routes
from app.routes.triageCase import router as triage_routes
from app.routes.user import router as user_routes
from app.routes.patient import router as patient_routes
from app.routes.audit import router as audit_routes
from app.core.database import engine
from app.core.config import settings
from app.core.dependencies import get_db
from app.core.audit_middleware import AuditMetadataMiddleware

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(AuditMetadataMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes)
app.include_router(triage_routes)
app.include_router(user_routes)
app.include_router(patient_routes)
app.include_router(audit_routes)

@app.get("/")
def root():
    return {"message": "FastAPI + PostgreSQL Backend Running"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.exec(text("SELECT 1"))
        logger.info("Health check: database connected")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}