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

# Create default super-admin on first startup
def _create_default_admin():
    from .models.user import User, ROLES_PRESETS
    from .services.auth_service import hash_password
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin = User(
                nom="Administrateur",
                prenom="",
                email="admin@ao-manager.ma",
                password_hash=hash_password("Admin@2024"),
                role_predefini="admin",
                permissions=ROLES_PRESETS["admin"],
                is_active=True,
                is_super_admin=True,
            )
            db.add(admin)
            db.commit()
            print("✅ Compte admin créé : admin@ao-manager.ma / Admin@2024")
    finally:
        db.close()

_create_default_admin()

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
