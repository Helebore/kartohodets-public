from sqlalchemy import Column, Integer, String, Float, DateTime, func
from .database import Base

class Pano(Base):
    __tablename__ = "panos"

    id = Column(Integer, primary_key=True, nullable=False)
    pano_id = Column(String, nullable=False, unique=True)
    lat = Column(Float)
    lng = Column(Float)
    date = Column(DateTime)
    source_method = Column(String) 
    created_at = Column(DateTime, server_default=func.now())