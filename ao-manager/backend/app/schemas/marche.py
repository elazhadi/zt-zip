from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class MarcheCreate(BaseModel):
    ao_id: int
    reponse_id: Optional[int] = None
    societe_id: int
    numero_marche: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_ttc: Optional[float] = None


class MarcheUpdate(BaseModel):
    numero_marche: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_ttc: Optional[float] = None
    statut_execution: Optional[str] = None
    etapes: Optional[Any] = None
    fichiers: Optional[Any] = None


class MarcheOut(BaseModel):
    id: int
    ao_id: int
    reponse_id: Optional[int] = None
    societe_id: int
    numero_marche: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_ttc: Optional[float] = None
    caution_definitive: Optional[float] = None
    retenue_garantie: Optional[float] = None
    statut_execution: Optional[str] = None
    etapes: Optional[Any] = None
    fichiers: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True
