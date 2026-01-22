from math import exp
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import desc

from backend.models.user import User

class UserService:
    @staticmethod
    def get_user_by_id(db: Session, user_id: int):
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_empty_id(db: Session):
        return db.query(User).count()

    @staticmethod
    def get_leaderboard_and_stats(db: Session, email: str):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        users = db.query(User).order_by(desc(User.elo)).all()
        rank = 0
        for user in users:
            rank += 1
            if user.email == email:
                break
        stats = {'rank': rank, 'score': user.elo, 'games': user.matches}
        leaderboard = []
        for user in users[:10]:
            leaderboard.append({
                'name': user.email,
                'score': user.elo,
            })
        return {'user': stats, 'top': leaderboard}


    @staticmethod
    def create_user(db: Session, email: str):
        user = User(email=email, id=UserService.get_empty_id(db), temp_elo=0, sum_km = 0, matches=0)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def add_user_to_room(db: Session, email: str, room_id: int):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.room_id = room_id
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def remove_user_from_room(db: Session, email: str):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.room_id = None
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_coord(db: Session, email: str, coord_x: float, coord_y: float ):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.coord = str(coord_x) + ' ' + str(coord_y)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_temp_score(db: Session, email: str, km: int):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.temp_elo += 127420 - km
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def zero_temp_score(db: Session, email: str):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.temp_elo = 0
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_coord(db: Session, email: str):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        return map(float, user.coord.split())

    @staticmethod
    def get_elo(db: Session, email: str):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        return user.elo

    @staticmethod
    def update_and_return_elo(db: Session, email: str, km: int):
        user = UserService.get_user_by_email(db, email)
        if not user:
            return None
        user.sum_km += int((40075 / 2 - km) / 10) + 100
        print(user.sum_km)
        user.matches += 1
        user.elo = round(user.sum_km / user.matches)
        db.commit()
        db.refresh(user)
        print(user.elo, km)
        return user.elo