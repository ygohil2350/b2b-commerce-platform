from sqlalchemy import select
from app.database import Base, SessionLocal, engine
from app.models import Category, InventoryMovement, MovementType, Product, Role, User
from app.security import hash_password


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User.id).limit(1)):
            return
        supplier = User(email="supplier@example.com", full_name="Demo Supplier", password_hash=hash_password("Supplier123!"), role=Role.supplier)
        buyer = User(email="buyer@example.com", full_name="Demo Buyer", password_hash=hash_password("Buyer123!"), role=Role.buyer)
        categories = [Category(name=name) for name in ["Electronics", "Industrial", "Office", "Safety"]]
        db.add_all([supplier, buyer, *categories]); db.flush()
        specs = [("ELEC-100", "Industrial Sensor", 149.99, 84, 20, 0), ("IND-220", "Hydraulic Pump", 899.00, 12, 15, 1), ("OFF-310", "Thermal Label Roll", 24.50, 240, 50, 2), ("SAFE-410", "Safety Helmet Case", 319.00, 8, 10, 3), ("ELEC-520", "Control Relay Pack", 79.95, 0, 12, 0), ("IND-630", "Stainless Fastener Kit", 129.00, 46, 20, 1)]
        for sku, name, price, stock, reorder, category_index in specs:
            product = Product(sku=sku, name=name, description=f"Commercial-grade {name.lower()} for bulk procurement.", price=price, stock_quantity=stock, reorder_level=reorder, category_id=categories[category_index].id)
            db.add(product); db.flush()
            db.add(InventoryMovement(product_id=product.id, quantity_delta=stock, movement_type=MovementType.stock_in, reference="Seed inventory"))
        db.commit()


if __name__ == "__main__":
    seed()

