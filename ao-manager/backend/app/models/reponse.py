from sqlalchemy import Column, Integer, Numeric, Date, TIMESTAMP, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Reponse(Base):
    __tablename__ = "reponses"

    id = Column(Integer, primary_key=True, index=True)
    ao_id = Column(Integer, ForeignKey("appels_offres.id", ondelete="CASCADE"), nullable=False)
    societe_id = Column(Integer, ForeignKey("societes.id"), nullable=False)
    pct_estimation = Column(Numeric)
    montant_ht = Column(Numeric)
    montant_ttc = Column(Numeric)
    prix_detail = Column(JSONB)
    fichiers_generes = Column(JSONB)
    zip_path = Column(Text)
    date_soumission = Column(Date)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    ao = relationship("AppelOffre", back_populates="reponses")
    societe = relationship("Societe", back_populates="reponses")
    marche = relationship("Marche", back_populates="reponse", uselist=False)
