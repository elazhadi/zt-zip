from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class ResultatAO(Base):
    __tablename__ = "resultats_ao"

    id = Column(Integer, primary_key=True, index=True)
    ao_id = Column(Integer, ForeignKey("appels_offres.id", ondelete="SET NULL"), nullable=True, index=True)
    objet = Column(Text)
    maitre_ouvrage = Column(String(255))
    domaine = Column(String(100))
    date_seance = Column(String(20))
    estimation_mo = Column(Float)
    image_path = Column(String(500))

    ao = relationship("AppelOffre", foreign_keys=[ao_id])

    # JSON: [{nom, offre_ht, pct_estimation, rang, statut: admis|ecarte}]
    concurrents = Column(JSON, default=list)

    # Mieux disant extrait
    mieux_disant_nom = Column(String(255))
    mieux_disant_offre = Column(Float)
    mieux_disant_pct = Column(Float)

    # Notre société si on a participé
    notre_societe = Column(String(100))
    notre_offre = Column(Float)
    notre_rang = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
