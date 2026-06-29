from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, MODULE_ACTIONS, MODULE_LABELS, ROLE_LABELS
from ..services.auth_service import verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


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
        "societes_autorisees": u.societes_autorisees,
        "last_login": u.last_login,
        "created_at": u.created_at,
    }


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(401, "Non authentifié — veuillez vous connecter")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, "Token invalide ou expiré")
    user = db.query(User).filter(User.id == int(payload["sub"]), User.is_active == True).first()
    if not user:
        raise HTTPException(401, "Utilisateur introuvable ou désactivé")
    return user


def require_permission(module: str, action: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.has_permission(module, action):
            raise HTTPException(403, f"Permission refusée : {module}.{action}")
        return current_user
    return checker


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"🔐 login: user not found for {email}")
        raise HTTPException(401, "Email ou mot de passe incorrect")
    ok = verify_password(data.password, user.password_hash)
    print(f"🔐 login: {email} — hash_prefix={user.password_hash[:10] if user.password_hash else 'NULL'} — verify={ok}")
    if not ok:
        raise HTTPException(401, "Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(403, "Compte désactivé")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user.id, user.email)
    return {"access_token": token, "token_type": "bearer", "user": _user_out(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)


@router.post("/change-password")
def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from ..services.auth_service import verify_password, hash_password
    if not verify_password(data.get("ancien_mdp", ""), current_user.password_hash):
        raise HTTPException(400, "Ancien mot de passe incorrect")
    nouveau = data.get("nouveau_mdp", "")
    if len(nouveau) < 6:
        raise HTTPException(400, "Le nouveau mot de passe doit avoir au moins 6 caractères")
    current_user.password_hash = hash_password(nouveau)
    db.commit()
    return {"ok": True}
