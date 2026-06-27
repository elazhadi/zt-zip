from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime, date


class ArticlePrix(BaseModel):
    designation: str
    quantite: float
    unite: str
    prix_unitaire: float
    montant: float


class PrixDistribution(BaseModel):
    articles: List[ArticlePrix]
    total_ht: float
    total_ttc: float
    tva_rate: float = 0.20


class ReponseCreate(BaseModel):
    ao_id: int
    societe_id: int
    pct_estimation: float


class ReponseOut(BaseModel):
    id: int
    ao_id: int
    societe_id: int
    pct_estimation: Optional[float] = None
    montant_ht: Optional[float] = None
    montant_ttc: Optional[float] = None
    prix_detail: Optional[Any] = None
    fichiers_generes: Optional[Any] = None
    zip_path: Optional[str] = None
    date_soumission: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True
