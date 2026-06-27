from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SocieteBase(BaseModel):
    code: str
    raison_sociale: str
    forme_juridique: Optional[str] = None
    rc: Optional[str] = None
    if_fiscal: Optional[str] = None
    ice: Optional[str] = None
    cnss: Optional[str] = None
    patente: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    gerant: Optional[str] = None
    capital: Optional[float] = None
    email: Optional[str] = None
    tel: Optional[str] = None
    rib: Optional[str] = None
    domaines: Optional[List[str]] = None
    banque_domiciliation: Optional[str] = None
    titre_directeur_banque: Optional[str] = None


class SocieteCreate(SocieteBase):
    pass


class SocieteUpdate(BaseModel):
    raison_sociale: Optional[str] = None
    forme_juridique: Optional[str] = None
    rc: Optional[str] = None
    if_fiscal: Optional[str] = None
    ice: Optional[str] = None
    cnss: Optional[str] = None
    patente: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    gerant: Optional[str] = None
    capital: Optional[float] = None
    email: Optional[str] = None
    tel: Optional[str] = None
    rib: Optional[str] = None
    domaines: Optional[List[str]] = None
    banque_domiciliation: Optional[str] = None
    titre_directeur_banque: Optional[str] = None


class SocieteOut(SocieteBase):
    id: int
    logo_path: Optional[str] = None
    entete_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
