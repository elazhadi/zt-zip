from sqlalchemy import Column, Integer, Text, Numeric, TIMESTAMP, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Marche(Base):
    __tablename__ = "marches"

    id = Column(Integer, primary_key=True, index=True)
    ao_id = Column(Integer, ForeignKey("appels_offres.id"), nullable=False)
    reponse_id = Column(Integer, ForeignKey("reponses.id"))
    societe_id = Column(Integer, ForeignKey("societes.id"), nullable=False)
    numero_marche = Column(Text)
    montant_ht = Column(Numeric)
    montant_ttc = Column(Numeric)
    caution_definitive = Column(Numeric)
    retenue_garantie = Column(Numeric)
    statut_execution = Column(String(30))
    etapes = Column(JSONB, default=list)
    fichiers = Column(JSONB, default=dict)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    ao = relationship("AppelOffre", back_populates="marches")
    reponse = relationship("Reponse", back_populates="marche")
    societe = relationship("Societe", back_populates="marches")
