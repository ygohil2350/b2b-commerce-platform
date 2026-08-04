import uuid
import pytest
from pydantic import ValidationError
from app.models import Role
from app.schemas import OrderCreate, OrderItemCreate, ProductCreate, UserCreate


def test_order_rejects_duplicate_product_lines():
    product_id = uuid.uuid4()
    with pytest.raises(ValidationError):
        OrderCreate(items=[OrderItemCreate(product_id=product_id, quantity=2), OrderItemCreate(product_id=product_id, quantity=3)])


def test_order_rejects_non_positive_quantity():
    with pytest.raises(ValidationError):
        OrderItemCreate(product_id=uuid.uuid4(), quantity=0)


def test_product_requires_positive_price_and_valid_sku():
    with pytest.raises(ValidationError):
        ProductCreate(sku="invalid sku!", name="Sensor", category_id=1, price=0)


def test_user_requires_strong_minimum_length():
    with pytest.raises(ValidationError):
        UserCreate(email="buyer@example.com", full_name="Buyer", password="short", role=Role.buyer)

