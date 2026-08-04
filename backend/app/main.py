from contextlib import asynccontextmanager
from typing import Annotated, Literal
import uuid
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from app.config import settings
from app.database import Base, engine, get_db
from app.models import Category, InventoryMovement, MovementType, Order, Product, Role, User
from app.schemas import CategoryRead, DashboardStats, OrderCreate, OrderRead, ProductCreate, ProductPage, ProductRead, StockAdjustment, Token, UserCreate, UserRead
from app.security import create_access_token, get_current_user, hash_password, require_role, verify_password
from app.services import dashboard_stats, place_order


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan, openapi_url=f"{settings.api_prefix}/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
Db = Annotated[Session, Depends(get_db)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.post(f"{settings.api_prefix}/auth/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Db):
    user = User(email=payload.email.lower(), full_name=payload.full_name, password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    try:
        db.commit(); db.refresh(user)
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="Email already registered")
    return Token(access_token=create_access_token(user), user=user)


@app.post(f"{settings.api_prefix}/auth/login", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: Db):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user), user=user)


@app.get(f"{settings.api_prefix}/auth/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user


@app.get(f"{settings.api_prefix}/categories", response_model=list[CategoryRead])
def categories(db: Db, _: Annotated[User, Depends(get_current_user)]):
    return db.scalars(select(Category).order_by(Category.name)).all()


@app.get(f"{settings.api_prefix}/products", response_model=ProductPage)
def products(db: Db, _: Annotated[User, Depends(get_current_user)], search: str | None = Query(default=None, max_length=100), category_id: int | None = None, min_price: float | None = Query(default=None, ge=0), max_price: float | None = Query(default=None, ge=0), availability: Literal["all", "in_stock", "low_stock", "out_of_stock"] = "all", sort: Literal["name", "price_asc", "price_desc", "stock_asc", "stock_desc"] = "name", page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    query = select(Product).options(selectinload(Product.category))
    if search: query = query.where(or_(Product.name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%")))
    if category_id: query = query.where(Product.category_id == category_id)
    if min_price is not None: query = query.where(Product.price >= min_price)
    if max_price is not None: query = query.where(Product.price <= max_price)
    if availability == "in_stock": query = query.where(Product.stock_quantity > Product.reorder_level)
    elif availability == "low_stock": query = query.where(Product.stock_quantity > 0, Product.stock_quantity <= Product.reorder_level)
    elif availability == "out_of_stock": query = query.where(Product.stock_quantity == 0)
    ordering = {"name": Product.name.asc(), "price_asc": Product.price.asc(), "price_desc": Product.price.desc(), "stock_asc": Product.stock_quantity.asc(), "stock_desc": Product.stock_quantity.desc()}[sort]
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery())) or 0
    items = db.scalars(query.order_by(ordering).offset((page - 1) * page_size).limit(page_size)).all()
    return ProductPage(items=items, total=total, page=page, page_size=page_size)


@app.post(f"{settings.api_prefix}/products", response_model=ProductRead, status_code=201)
def create_product(payload: ProductCreate, db: Db, _: Annotated[User, Depends(require_role(Role.supplier))]):
    if not db.get(Category, payload.category_id): raise HTTPException(status_code=404, detail="Category not found")
    product = Product(**payload.model_dump())
    db.add(product)
    try:
        db.flush()
        if product.stock_quantity: db.add(InventoryMovement(product_id=product.id, quantity_delta=product.stock_quantity, movement_type=MovementType.stock_in, reference="Initial stock"))
        db.commit(); db.refresh(product)
    except IntegrityError:
        db.rollback(); raise HTTPException(status_code=409, detail="SKU already exists")
    return db.scalar(select(Product).where(Product.id == product.id).options(selectinload(Product.category)))


@app.post(f"{settings.api_prefix}/products/{{product_id}}/stock", response_model=ProductRead)
def add_stock(product_id: uuid.UUID, payload: StockAdjustment, db: Db, _: Annotated[User, Depends(require_role(Role.supplier))]):
    product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if not product: raise HTTPException(status_code=404, detail="Product not found")
    product.stock_quantity += payload.quantity
    db.add(InventoryMovement(product_id=product.id, quantity_delta=payload.quantity, movement_type=MovementType.stock_in, reference=payload.reference))
    db.commit()
    return db.scalar(select(Product).where(Product.id == product.id).options(selectinload(Product.category)))


@app.post(f"{settings.api_prefix}/orders", response_model=OrderRead, status_code=201)
def create_order(payload: OrderCreate, db: Db, buyer: Annotated[User, Depends(require_role(Role.buyer))]):
    return place_order(db, buyer, payload)


@app.get(f"{settings.api_prefix}/orders", response_model=list[OrderRead])
def list_orders(db: Db, user: Annotated[User, Depends(get_current_user)]):
    query = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    if user.role == Role.buyer: query = query.where(Order.buyer_id == user.id)
    return db.scalars(query).all()


@app.get(f"{settings.api_prefix}/dashboard", response_model=DashboardStats)
def dashboard(db: Db, _: Annotated[User, Depends(get_current_user)]):
    return dashboard_stats(db)

