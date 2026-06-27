from sqlalchemy import Column, Integer, String, Text, Date, TIMESTAMP, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class DocumentRef(Base):
    __tablename__ = "documents_ref"

    id = Column(Integer, primary_key=True, index=True)
    societe_id = Column(Integer, ForeignKey("societes.id", ondelete="CASCADE"), nullable=False)
    type_doc = Column(String(50))  # statut | attestation_ref | note_htm
    file_path = Column(Text)
    date_certification = Column(Date)
    date_expiration = Column(Date)
    infos_extraites = Column(JSONB)
    version = Column(Integer, default=1)
    actif = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    societe = relationship("Societe", back_populates="documents")
