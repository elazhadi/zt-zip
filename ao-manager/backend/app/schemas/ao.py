from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime


class AOBase(BaseModel):
    reference: Optional[str] = None
    objet: Optional[str] = None
    maitre_ouvrage: Optional[Any] = None
    date_limite: Optional[datetime] = None
    procedure: Optional[str] = None
    domaine: Optional[str] = None
    reserve_tpme: bool = False
    estimation: Optional[float] = None
    lots: Optional[Any] = None
    caution_provisoire: Optional[float] = None
    delai_execution: Optional[Any] = None
    delai_garantie: Optional[Any] = None
    lieu_realisation: Optional[str] = None
    marque_specifique: Optional[Any] = None
    prospectus_exige: bool = False
    echantillon_exige: bool = False
    tete_de_serie: bool = False
    structure_offre: Optional[Any] = None
    notation_technique: Optional[Any] = None
    offre_technique_exigee: bool = False
    criteres_notation: Optional[Any] = None
    notes: Optional[str] = None
    url_portail: Optional[str] = None
    societe_soumissionnaire_id: Optional[int] = None


class AOCreate(AOBase):
    pass


class AOUpdate(BaseModel):
    reference: Optional[str] = None
    objet: Optional[str] = None
    maitre_ouvrage: Optional[Any] = None
    date_limite: Optional[datetime] = None
    procedure: Optional[str] = None
    domaine: Optional[str] = None
    reserve_tpme: Optional[bool] = None
    estimation: Optional[float] = None
    lots: Optional[Any] = None
    caution_provisoire: Optional[float] = None
    delai_execution: Optional[Any] = None
    delai_garantie: Optional[Any] = None
    lieu_realisation: Optional[str] = None
    prospectus_exige: Optional[bool] = None
    echantillon_exige: Optional[bool] = None
    statut: Optional[str] = None
    decision: Optional[str] = None
    notes: Optional[str] = None
    url_portail: Optional[str] = None
    societe_soumissionnaire_id: Optional[int] = None


class AOOut(AOBase):
    id: int
    fichiers_dao: Optional[Any] = None
    statut: str
    decision: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AOAnalyse(BaseModel):
    ao_id: int
    extracted_data: Any
    warnings: List[str] = []
