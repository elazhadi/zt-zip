from sqlalchemy import Column, Integer, Text, Numeric, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Concurrent(Base):
    __tablename__ = "concurrents"

    id = Column(Integer, primary_key=True, index=True)
    ao_id = Column(Integer, ForeignKey("appels_offres.id", ondelete="CASCADE"), nullable=False)
    nom = Column(Text)
    offre = Column(Numeric)
    statut = Column(String(20))  # admissible|ecarte
    rang = Column(Integer)

    ao = relationship("AppelOffre", back_populates="concurrents")
