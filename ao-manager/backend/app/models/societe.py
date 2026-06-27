from sqlalchemy import Column, Integer, String, Text, Numeric, ARRAY, TIMESTAMP, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Societe(Base):
    __tablename__ = "societes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    raison_sociale = Column(Text, nullable=False)
    forme_juridique = Column(String(20))
    rc = Column(Text)
    if_fiscal = Column(Text)
    ice = Column(String(15))
    cnss = Column(Text)
    patente = Column(Text)
    adresse = Column(Text)
    ville = Column(Text)
    gerant = Column(Text)
    capital = Column(Numeric)
    email = Column(Text)
    tel = Column(Text)
    rib = Column(Text)
    logo_path = Column(Text)
    entete_path = Column(Text)
    domaines = Column(ARRAY(Text))
    banque_domiciliation = Column(Text)
    titre_directeur_banque = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    documents = relationship("DocumentRef", back_populates="societe", cascade="all, delete-orphan")
    reponses = relationship("Reponse", back_populates="societe")
    marches = relationship("Marche", back_populates="societe")
