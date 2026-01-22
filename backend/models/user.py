from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, nullable=False)
    email = Column(String, nullable=False, unique=True)
    elo = Column(Integer, default=1000)
    matches = Column(Integer, default=0)
    coord = Column(String)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    sum_km = Column(Integer)
    temp_elo = Column(Integer)


