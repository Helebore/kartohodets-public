from sqlalchemy import Column, Integer, String, Time, ForeignKey
from .database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, nullable=False)
    pan_id = Column(String)
    host_email = Column(String, ForeignKey("users.email"))

