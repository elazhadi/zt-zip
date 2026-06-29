import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routes import societes, aos, reponses, marches, documents, resultats
from .config import settings

# Create tables if not exist (dev only; use Alembic in prod)
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

app.include_router(societes.router)
app.include_router(aos.router)
app.include_router(reponses.router)
app.include_router(marches.router)
app.include_router(documents.router)
app.include_router(resultats.router)

# Serve uploads
uploads_dir = settings.UPLOAD_DIR
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Serve frontend (built React app) — only if dist/ exists
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
