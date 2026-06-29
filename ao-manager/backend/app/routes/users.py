from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, ROLES_PRESETS, MODULES, MODULE_ACTIONS, MODULE_LABELS, ROLE_LABELS
from ..services.auth_service import hash_password
from .auth import get_current_user, require_permission

router = APIRouter(prefix="/users", tags=["Utilisateurs"])


class UserCreate(BaseModel):
    nom: str
    prenom: Optional[str] = ""
    email: str
    password: str
    role_predefini: str = "consultant"
    permissions: Optional[dict] = None


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[str] = None
    role_predefini: Optional[str] = None
    permissions: Optional[dict] = None
    is_active: Optional[bool] = None


def _user_out(u: User) -> dict:
    return {
        "id": u.id,
        "nom": u.nom,
        "prenom": u.prenom,
        "email": u.email,
        "role_predefini": u.role_predefini,
        "role_label": ROLE_LABELS.get(u.role_predefini, u.role_predefini),
        "permissions": u.permissions,
        "is_super_admin": u.is_super_admin,
        "is_active": u.is_active,
        "last_login": u.last_login,
        "created_at": u.created_at,
    }


@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "consulter")),
):
    users = db.query(User).order_by(User.created_at).all()
    return [_user_out(u) for u in users]


@router.post("/", status_code=201)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "creer")),
):
    if db.query(User).filter(User.email == data.email.lower().strip()).first():
        raise HTTPException(400, f"Email '{data.email}' déjà utilisé")
    if len(data.password) < 6:
        raise HTTPException(400, "Le mot de passe doit avoir au moins 6 caractères")

    permissions = data.permissions or ROLES_PRESETS.get(data.role_predefini, ROLES_PRESETS["consultant"])
    u = User(
        nom=data.nom,
        prenom=data.prenom or "",
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role_predefini=data.role_predefini,
        permissions=permissions,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return _user_out(u)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "modifier")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if u.is_super_admin and not current_user.is_super_admin:
        raise HTTPException(403, "Impossible de modifier un super-admin")

    if data.nom is not None:
        u.nom = data.nom
    if data.prenom is not None:
        u.prenom = data.prenom
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email.lower(), User.id != user_id).first()
        if existing:
            raise HTTPException(400, "Email déjà utilisé")
        u.email = data.email.lower()
    if data.role_predefini is not None:
        u.role_predefini = data.role_predefini
        # Auto-apply preset permissions if role changes
        if data.permissions is None and data.role_predefini in ROLES_PRESETS:
            u.permissions = ROLES_PRESETS[data.role_predefini]
    if data.permissions is not None:
        u.permissions = data.permissions
        u.role_predefini = "custom"
    if data.is_active is not None:
        u.is_active = data.is_active

    db.commit()
    db.refresh(u)
    return _user_out(u)


@router.put("/{user_id}/permissions")
def update_permissions(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "modifier")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if u.is_super_admin and not current_user.is_super_admin:
        raise HTTPException(403, "Impossible de modifier les permissions d'un super-admin")

    permissions = data.get("permissions", {})
    role = data.get("role_predefini", "custom")
    u.permissions = permissions
    u.role_predefini = role
    db.commit()
    db.refresh(u)
    return _user_out(u)


@router.put("/{user_id}/reset-password")
def reset_password(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "modifier")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    nouveau = data.get("nouveau_mdp", "")
    if len(nouveau) < 6:
        raise HTTPException(400, "Le mot de passe doit avoir au moins 6 caractères")
    u.password_hash = hash_password(nouveau)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("utilisateurs", "supprimer")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if u.is_super_admin:
        raise HTTPException(403, "Impossible de supprimer le super-admin")
    if u.id == current_user.id:
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    db.delete(u)
    db.commit()


@router.get("/meta/roles")
def get_roles_meta(current_user: User = Depends(get_current_user)):
    return {
        "roles": ROLE_LABELS,
        "presets": ROLES_PRESETS,
        "modules": {m: {"label": MODULE_LABELS[m], "actions": MODULE_ACTIONS[m]} for m in MODULES},
    }
