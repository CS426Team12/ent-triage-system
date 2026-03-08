import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class AuditMetadataMiddleware(BaseHTTPMiddleware):
    # Middleware to capture request metadata (IP address) for audit logging.
    
    async def dispatch(self, request: Request, call_next):
        # Check X-Forwarded-For first (for proxied requests), fallback to client address
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else None
        
        # Store metadata in request state for access in route handlers
        request.state.audit_meta = {
            "ip": client_ip,
        }
        
        logger.debug(f"Audit metadata captured: IP={client_ip}")
        
        response = await call_next(request)
        return response


def get_audit_meta(request: Request) -> dict:
    return getattr(request.state, "audit_meta", {"ip": None, "user_agent": None})
