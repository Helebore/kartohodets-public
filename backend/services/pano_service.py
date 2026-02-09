from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
import random
from backend.models.pano import Pano

class PanoService:
    @staticmethod
    def get_random_pano(db: Session):
        target_method = 'osm' if random.random() < 0.7 else 'radial'
        pano = db.query(Pano).filter(Pano.source_method == target_method).order_by(func.random()).first()
        if not pano:
            pano = db.query(Pano).order_by(func.random()).first()
        return pano