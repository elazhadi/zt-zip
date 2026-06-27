from sqlalchemy import Column, Integer, String, Text, Numeric, TIMESTAMP, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class AppelOffre(Base):
    __tablename__ = "appels_offres"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(Text, unique=True)
    objet = Column(Text)
    maitre_ouvrage = Column(JSONB)
    date_limite = Column(TIMESTAMP)
    procedure = Column(Text)
    domaine = Column(Text)
    reserve_tpme = Column(Boolean, default=False)
    estimation = Column(Numeric)
    lots = Column(JSONB)
    caution_provisoire = Column(Numeric)
    delai_execution = Column(JSONB)
    delai_garantie = Column(JSONB)
    lieu_realisation = Column(Text)
    marque_specifique = Column(JSONB)
    prospectus_exige = Column(Boolean, default=False)
    echantillon_exige = Column(Boolean, default=False)
    tete_de_serie = Column(Boolean, default=False)
    structure_offre = Column(JSONB)
    notation_technique = Column(JSONB)
    offre_technique_exigee = Column(Boolean, default=False)
    criteres_notation = Column(JSONB)
    fichiers_dao = Column(JSONB)
    statut = Column(String(30), default="en_instance")
    decision = Column(String(20))  # oui|non|en_attente
    notes = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    reponses = relationship("Reponse", back_populates="ao", cascade="all, delete-orphan")
    marches = relationship("Marche", back_populates="ao")
    concurrents = relationship("Concurrent", back_populates="ao", cascade="all, delete-orphan")
