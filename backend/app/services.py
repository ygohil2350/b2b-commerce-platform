from datetime import date, timedelta
from decimal import Decimal
import uuid
from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload
from app.models import InventoryMovement, MovementType, Order, OrderItem, OrderStatus, Product, User
from app.schemas import DashboardStats, OrderCreate, TrendPoint


def place_order(db: Session, buyer: User, payload: OrderCreate) -> Order:
    product_ids = sorted((item.product_id for item in payload.items), key=str)
    requested = {item.product_id: item.quantity for item in payload.items}
    try:
        products = db.scalars(select(Product).where(Product.id.in_(product_ids)).order_by(Product.id).with_for_update()).all()
        if len(products) != len(product_ids):
            raise HTTPException(status_code=404, detail="One or more products were not found")
        shortages = [{"sku": p.sku, "available": p.stock_quantity, "requested": requested[p.id]} for p in products if p.stock_quantity < requested[p.id]]
        if shortages:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"message": "Insufficient inventory", "shortages": shortages})

        order_id = uuid.uuid4()
        suffix = order_id.hex[:10].upper()
        order = Order(id=order_id, order_number=f"ORD-{suffix}", invoice_number=f"INV-{suffix}", buyer_id=buyer.id, status=OrderStatus.confirmed, total_amount=Decimal("0"))
        total = Decimal("0")
        for product in products:
            quantity = requested[product.id]
            line_total = product.price * quantity
            total += line_total
            product.stock_quantity -= quantity
            order.items.append(OrderItem(product_id=product.id, product_name=product.name, sku=product.sku, quantity=quantity, unit_price=product.price, line_total=line_total))
            db.add(InventoryMovement(product_id=product.id, quantity_delta=-quantity, movement_type=MovementType.order_out, reference=order.order_number))
        order.total_amount = total
        db.add(order)
        db.commit()
        return db.scalar(select(Order).where(Order.id == order.id).options(selectinload(Order.items)))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


def dashboard_stats(db: Session, days: int = 30) -> DashboardStats:
    product_stats = db.execute(select(func.count(Product.id), func.coalesce(func.sum(Product.stock_quantity), 0), func.coalesce(func.sum(Product.price * Product.stock_quantity), 0), func.count(Product.id).filter(Product.stock_quantity <= Product.reorder_level))).one()
    start = date.today() - timedelta(days=days - 1)
    rows = db.execute(select(func.date(InventoryMovement.created_at), func.coalesce(func.sum(case((InventoryMovement.quantity_delta > 0, InventoryMovement.quantity_delta), else_=0)), 0), func.coalesce(func.sum(case((InventoryMovement.quantity_delta < 0, -InventoryMovement.quantity_delta), else_=0)), 0)).where(InventoryMovement.created_at >= start).group_by(func.date(InventoryMovement.created_at))).all()
    by_day = {row[0]: (row[1], row[2]) for row in rows}
    trends = [TrendPoint(day=start + timedelta(days=i), stock_in=by_day.get(start + timedelta(days=i), (0, 0))[0], order_out=by_day.get(start + timedelta(days=i), (0, 0))[1]) for i in range(days)]
    return DashboardStats(total_products=product_stats[0], total_units=product_stats[1], inventory_value=product_stats[2], low_stock_count=product_stats[3], trends=trends)

