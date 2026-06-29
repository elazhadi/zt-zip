from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from ..database import Base

MODULES = [
    "pipeline", "analyse", "reponses", "marches",
    "referentiel", "resultats", "intelligence", "parametres", "utilisateurs"
]
ACTIONS = ["consulter", "creer", "modifier", "supprimer"]

# Module labels for display
MODULE_LABELS = {
    "pipeline":     "Pipeline AO",
    "analyse":      "Analyse DAO",
    "reponses":     "Réponses & Offres",
    "marches":      "Suivi Marchés",
    "referentiel":  "Référentiel Sociétés",
    "resultats":    "Résultats AO",
    "intelligence": "Intelligence",
    "parametres":   "Paramètres",
    "utilisateurs": "Gestion Utilisateurs",
}

# Actions available per module (some modules don't have all 4)
MODULE_ACTIONS = {
    "pipeline":     ["consulter", "creer", "modifier", "supprimer"],
    "analyse":      ["consulter", "creer"],
    "reponses":     ["consulter", "creer", "modifier", "supprimer"],
    "marches":      ["consulter", "creer", "modifier", "supprimer"],
    "referentiel":  ["consulter", "creer", "modifier", "supprimer"],
    "resultats":    ["consulter", "creer", "modifier", "supprimer"],
    "intelligence": ["consulter"],
    "parametres":   ["consulter", "modifier"],
    "utilisateurs": ["consulter", "creer", "modifier", "supprimer"],
}

def _full(mods=None):
    target = mods or MODULES
    return {m: {a: True for a in MODULE_ACTIONS[m]} for m in target}

def _readonly(mods=None):
    target = mods or MODULES
    return {m: {a: a == "consulter" for a in MODULE_ACTIONS[m]} for m in target}

ROLES_PRESETS = {
    "admin": _full(),
    "gestionnaire": {
        "pipeline":     {"consulter": True,  "creer": True,  "modifier": True,  "supprimer": True},
        "analyse":      {"consulter": True,  "creer": True},
        "reponses":     {"consulter": True,  "creer": True,  "modifier": True,  "supprimer": False},
        "marches":      {"consulter": True,  "creer": True,  "modifier": True,  "supprimer": False},
        "referentiel":  {"consulter": True,  "creer": True,  "modifier": True,  "supprimer": False},
        "resultats":    {"consulter": True,  "creer": True,  "modifier": True,  "supprimer": False},
        "intelligence": {"consulter": True},
        "parametres":   {"consulter": True,  "modifier": False},
        "utilisateurs": {"consulter": False, "creer": False, "modifier": False, "supprimer": False},
    },
    "soumissionnaire": {
        "pipeline":     {"consulter": True,  "creer": True,  "modifier": False, "supprimer": False},
        "analyse":      {"consulter": True,  "creer": True},
        "reponses":     {"consulter": True,  "creer": True,  "modifier": False, "supprimer": False},
        "marches":      {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "referentiel":  {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "resultats":    {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "intelligence": {"consulter": True},
        "parametres":   {"consulter": False, "modifier": False},
        "utilisateurs": {"consulter": False, "creer": False, "modifier": False, "supprimer": False},
    },
    "consultant": {
        "pipeline":     {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "analyse":      {"consulter": False, "creer": False},
        "reponses":     {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "marches":      {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "referentiel":  {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "resultats":    {"consulter": True,  "creer": False, "modifier": False, "supprimer": False},
        "intelligence": {"consulter": True},
        "parametres":   {"consulter": False, "modifier": False},
        "utilisateurs": {"consulter": False, "creer": False, "modifier": False, "supprimer": False},
    },
}

ROLE_LABELS = {
    "admin":          "Administrateur",
    "gestionnaire":   "Gestionnaire AO",
    "soumissionnaire":"Soumissionnaire",
    "consultant":     "Consultant",
    "custom":         "Personnalisé",
}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    prenom = Column(String(100), default="")
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role_predefini = Column(String(50), default="consultant")
    permissions = Column(JSONB, nullable=False, default=dict)
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    last_login = Column(TIMESTAMP, nullable=True)

    def has_permission(self, module: str, action: str) -> bool:
        if self.is_super_admin:
            return True
        return bool((self.permissions or {}).get(module, {}).get(action, False))
