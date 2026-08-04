import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models import OrderStatus, Role


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: Role


class UserRead(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class CategoryRead(ORMModel):
    id: int
    name: str


class ProductCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=60, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=2000)
    category_id: int = Field(gt=0)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    stock_quantity: int = Field(default=0, ge=0)
    reorder_level: int = Field(default=10, ge=0)


class ProductRead(ORMModel):
    id: uuid.UUID
    sku: str
    name: str
    description: str
    category: CategoryRead
    price: Decimal
    stock_quantity: int
    reorder_level: int
    updated_at: datetime


class ProductPage(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int


class StockAdjustment(BaseModel):
    quantity: int = Field(gt=0, le=1_000_000)
    reference: str | None = Field(default=None, max_length=100)


class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0, le=100_000)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("items")
    @classmethod
    def unique_products(cls, items: list[OrderItemCreate]) -> list[OrderItemCreate]:
        if len({item.product_id for item in items}) != len(items):
            raise ValueError("Each product can appear only once per order")
        return items


class OrderItemRead(ORMModel):
    product_id: uuid.UUID
    product_name: str
    sku: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderRead(ORMModel):
    id: uuid.UUID
    order_number: str
    status: OrderStatus
    total_amount: Decimal
    invoice_number: str
    created_at: datetime
    items: list[OrderItemRead]


class TrendPoint(BaseModel):
    day: date
    stock_in: int
    order_out: int


class DashboardStats(BaseModel):
    total_products: int
    total_units: int
    inventory_value: Decimal
    low_stock_count: int
    trends: list[TrendPoint]

