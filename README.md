# StockPilot — B2B Inventory & Order Management

A full-stack portfolio project for managing wholesale inventory, transactional bulk orders, and role-specific workflows. It combines a responsive React operations workspace with a FastAPI service and PostgreSQL-backed inventory ledger.

## Highlights

- Live inventory dashboard with stock value, units on hand, low-stock alerts, and 30-day supply trends
- Server-side product search, category/price/availability filters, sorting, and indexed pagination
- Transactional order engine using PostgreSQL row locks to prevent overselling under concurrent checkout
- Immutable order line snapshots and automatically generated order/invoice numbers
- JWT authentication with supplier and buyer authorization policies
- Supplier stock receiving and an auditable inventory movement ledger
- Strict Pydantic request validation and database-level constraints
- Dockerized PostgreSQL, FastAPI, React build, and Nginx delivery

## Architecture

```text
React + TypeScript + MUI
  ├── Redux Toolkit: auth, catalog, cart, orders
  └── Axios JWT client
             │ REST / JSON
FastAPI application
  ├── Pydantic validation + role dependencies
  ├── Catalog queries and dashboard aggregation
  └── Transactional order service
             │ SQLAlchemy 2.0
PostgreSQL
  ├── users, categories, products
  ├── orders, order_items
  └── inventory_movements
```

The order service sorts requested product IDs, locks their rows with `SELECT ... FOR UPDATE`, validates every stock balance, creates an order and invoice snapshot, deducts stock, and writes ledger movements inside one transaction. Any shortage returns HTTP `409` and rolls the entire transaction back. Stable lock ordering also reduces deadlock risk for overlapping bulk orders.

## Data model

| Table                 | Purpose                              | Important rules                                                    |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `users`               | Authenticated buyers and suppliers   | Unique normalized email, enum role                                 |
| `categories`          | Product taxonomy                     | Unique name                                                        |
| `products`            | Sellable catalog and current balance | Unique SKU; non-negative price, stock, and reorder level           |
| `inventory_movements` | Append-only supply history           | Signed quantity delta, type, reference, timestamp                  |
| `orders`              | Buyer order and invoice header       | Unique order/invoice numbers, stored total                         |
| `order_items`         | Commercial snapshot at checkout      | Unique product per order, positive quantity, stored SKU/name/price |

Production systems commonly add Alembic migrations, refresh-token rotation, tax/shipping policies, PDF invoice storage, idempotency keys, and a queue/outbox for downstream fulfillment. The current project keeps those seams explicit without hiding the core workflow behind infrastructure.

## Quick start with Docker

Requirements: Docker Desktop with Compose v2.

```bash
git clone <https://github.com/ygohil2350/b2b-commerce-platform>
cd b2b-commerce-platform
cp .env.example .env
docker compose up --build
```

Open:

- Web app: [http://localhost:5173](http://localhost:5173)
- API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

The API container creates the schema and seeds demo data only when the users table is empty.

| Workspace | Email                  | Password       |
| --------- | ---------------------- | -------------- |
| Buyer     | `buyer@example.com`    | `Buyer123!`    |
| Supplier  | `supplier@example.com` | `Supplier123!` |

Change `JWT_SECRET` and all demo credentials before deploying beyond local development.

## Local development

Start PostgreSQL only:

```bash
docker compose up -d db
```

Backend (Python 3.12):

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/b2b_commerce
python -m app.seed
uvicorn app.main:app --reload
```

On macOS/Linux, replace `set DATABASE_URL=...` with `export DATABASE_URL=...`.

Frontend (Node.js 22):

```bash
cd frontend
npm install
npm run dev
```

Vite reads `VITE_API_URL`; it defaults to `http://localhost:8000/api/v1`.

## API surface

| Method | Endpoint                      | Access        | Description                              |
| ------ | ----------------------------- | ------------- | ---------------------------------------- |
| `POST` | `/api/v1/auth/register`       | Public        | Create buyer or supplier account         |
| `POST` | `/api/v1/auth/login`          | Public        | OAuth2 password login and JWT issuance   |
| `GET`  | `/api/v1/auth/me`             | Authenticated | Current identity                         |
| `GET`  | `/api/v1/products`            | Authenticated | Indexed search/filter/sort/pagination    |
| `POST` | `/api/v1/products`            | Supplier      | Add a catalog product                    |
| `POST` | `/api/v1/products/{id}/stock` | Supplier      | Receive stock and write ledger entry     |
| `GET`  | `/api/v1/dashboard`           | Authenticated | Inventory KPIs and 30-day trends         |
| `POST` | `/api/v1/orders`              | Buyer         | Transactionally place a bulk order       |
| `GET`  | `/api/v1/orders`              | Authenticated | Buyer sees own orders; supplier sees all |

Interactive request/response schemas are available through Swagger UI at `/docs`.

## Quality checks

```bash
# Backend validation tests
cd backend && pytest

# Frontend type-check and production build
cd frontend && npm run build

# Container builds
docker compose build
```

## Repository layout

```text
backend/
  app/
    main.py          # routes and application lifecycle
    models.py        # relational SQLAlchemy schema
    schemas.py       # validated API contracts
    services.py      # transactional order and dashboard domain logic
    security.py      # JWT, password hashing, role policies
    seed.py           # idempotent local demo seed
  tests/
frontend/
  src/
    components/      # reusable workflow views
    store.ts         # Redux Toolkit state and async thunks
    api.ts           # authenticated HTTP client
docker-compose.yml
```

## Security and scaling notes

- Passwords use Argon2 through `pwdlib`; raw passwords are never stored.
- JWT expiry is configurable. A production deployment should use a secrets manager and asymmetric signing or a dedicated identity provider.
- Role enforcement lives on the API, not only in the UI.
- Composite indexes cover the main catalog filters; movement indexes support product history and date aggregation.
- The stateless API can scale horizontally. PostgreSQL remains the source of truth for stock consistency.
- For very large catalogs, add cursor pagination and PostgreSQL full-text or trigram search. For long trend windows, pre-aggregate movements into daily snapshots.

## License

This project is licensed under the MIT License.
