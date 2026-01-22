from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import desc
from random import randint

from backend.models.room import Room
from backend.models.user import User
from backend.services.user_service import UserService

class RoomService:
    @staticmethod
    def get_room_by_id(db: Session, id: int):
        return db.query(Room).filter(Room.id == id).first()

    @staticmethod
    def get_empty_id(db: Session):
        x = randint(100000, 999999)
        while (db.query(Room).filter(Room.id == x).first() is not None):
            x = randint(100000, 999999)
        return x

    @staticmethod
    def create_room(db: Session, host_email:str):
        host = UserService.get_user_by_email(db, host_email)
        if not host:
            return None
        room = Room(id = RoomService.get_empty_id(db), host_email = host_email)
        db.add(room)
        db.commit()
        db.refresh(room)
        return room


    @staticmethod
    def update_pan_id(db: Session, room_id: int, new_pan_id: str):
        room = RoomService.get_room_by_id(db, room_id)
        if not room:
            return None
        room.pan_id = new_pan_id
        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def get_all_users(db: Session, room_id: int):
        room = RoomService.get_room_by_id(db, room_id)
        users = db.query(User).filter(User.room_id == room.id).all()
        results = []
        for user in users:
            results.append(user.email)
        return results

    @staticmethod
    def get_all_users_with_coord(db: Session, room_id: int):
        room = RoomService.get_room_by_id(db, room_id)
        users = db.query(User).filter(User.room_id == room.id).all()
        results = []
        for user in users:
            lat, lng = map(float, user.coord.split())
            results.append({'name': user.email,
                            'coord': {'lat': lat, 'lng': lng}})
        return results

    @staticmethod
    def get_all_users_with_coord_and_tempelo(db: Session, room_id: int):
        room = RoomService.get_room_by_id(db, room_id)
        users = db.query(User).filter(User.room_id == room.id).all()
        results = []
        for user in users:
            lat, lng = map(float, user.coord.split())
            results.append({'name': user.email,
                            'coord': {'lat': lat, 'lng': lng},
                            'temp_score': user.temp_elo})
        return results