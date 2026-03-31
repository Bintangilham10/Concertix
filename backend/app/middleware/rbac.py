"""
T10 Mitigation: Role-Based Access Control (RBAC) Middleware.

Provides a generic `require_role()` dependency factory for FastAPI routes.
This ensures consistent role-checking across all protected endpoints.
"""

from typing import List
from fastapi import Depends, HTTPException, status

from app.models.user import User
from app.middleware.auth_middleware import get_current_user


def require_role(*allowed_roles: str):
    """
    FastAPI dependency that restricts endpoint access to users with specified roles.

    Usage:
        @router.post("/admin-action", dependencies=[Depends(require_role("admin"))])
        async def admin_action(): ...

        # Or as a parameter dependency for accessing user:
        @router.post("/admin-action")
        async def admin_action(user: User = Depends(require_role("admin"))): ...
    """

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akses ditolak. Anda tidak memiliki izin untuk endpoint ini.",
            )
        return current_user

    return role_checker
