import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, SessionLocal
from .routes import societes, aos, reponses, marches, documents, resultats
from .routes import auth as auth_router
from .routes import users as users_router
from .routes.auth import get_current_user
from .config import settings

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Apply schema changes for new columns added to existing tables."""
    from sqlalchemy import text
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS societes_autorisees JSONB",
            "ALTER TABLE appels_offres ADD COLUMN IF NOT EXISTS url_portail TEXT",
        ]:
            try:
                conn.execute(text(sql))
            except Exception:
                pass
        conn.commit()

_run_migrations()


def _ensure_admin():
    """Create or reset the default super-admin using raw SQL — no ORM, no passlib."""
    import json
    import bcrypt as _bcrypt
    from sqlalchemy import text
    from .models.user import ROLES_PRESETS

    pwd = "Admin@2024"
    try:
        h = _bcrypt.hashpw(pwd.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")
        assert _bcrypt.checkpw(pwd.encode("utf-8"), h.encode("utf-8")), "bcrypt self-test failed"
        print(f"🔑 bcrypt self-test OK — hash prefix: {h[:15]}")
    except Exception as e:
        print(f"❌ bcrypt error: {e}")
        return

    perms_json = json.dumps(ROLES_PRESETS["admin"])
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, password_hash FROM users WHERE email = 'admin@ao-manager.ma'")
            ).first()
            if row is None:
                conn.execute(text("""
                    INSERT INTO users
                      (nom, prenom, email, password_hash, role_predefini, permissions, is_active, is_super_admin)
                    VALUES
                      ('Administrateur', '', 'admin@ao-manager.ma', :h, 'admin', :p::jsonb, true, true)
                """), {"h": h, "p": perms_json})
                print(f"✅ Admin créé — hash: {h[:20]}...")
            else:
                old = row[1] or "NULL"
                conn.execute(text("""
                    UPDATE users
                    SET password_hash = :h,
                        is_active     = true,
                        is_super_admin= true,
                        permissions   = :p::jsonb
                    WHERE email = 'admin@ao-manager.ma'
                """), {"h": h, "p": perms_json})
                print(f"✅ Admin MàJ — old hash: {old[:15]} → new: {h[:15]}")
            conn.commit()
    except Exception as e:
        import traceback
        print(f"❌ _ensure_admin SQL error: {e}\n{traceback.format_exc()}")

_ensure_admin()

app = FastAPI(
    title="AO Manager API",
    description="Gestion & Réponse aux Appels d'Offres Publics Marocains",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes (no auth)
app.include_router(auth_router.router)

# Protected routes — require authentication
_auth = [Depends(get_current_user)]
app.include_router(societes.router, dependencies=_auth)
app.include_router(aos.router, dependencies=_auth)
app.include_router(reponses.router, dependencies=_auth)
app.include_router(marches.router, dependencies=_auth)
app.include_router(documents.router, dependencies=_auth)
app.include_router(resultats.router, dependencies=_auth)
app.include_router(users_router.router, dependencies=_auth)

# Serve uploads
uploads_dir = settings.UPLOAD_DIR
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# Serve frontend (built React app)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend_dist")
if os.path.isdir(FRONTEND_DIST):
    from fastapi.responses import FileResponse
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/")
    def root():
        return {"app": "AO Manager", "version": "3.0.0", "status": "running"}
