# StockPilot — B2B Inventory & Order Management

A full-stack portfolio project for managing wholesale inventory, transactional bulk orders, and role-specific workflows. It combines a responsive React operations workspace with a FastAPI service and PostgreSQL-backed inventory ledger.

> **AWS deployment:** Follow the command-only guide in
> [Push the containers to AWS ECR](#push-the-containers-to-aws-ecr) to build, tag, upload, and
> verify the API and frontend container images.

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
git clone <your-repository-url>
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

## Push the containers to AWS ECR

These commands build Linux production images for the API and web application and push them to
private [Amazon ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)
repositories. Run them from the repository root.

Requirements: Docker Desktop, AWS CLI v2, and an authenticated AWS profile with permission to
create and push to ECR repositories.

### Windows PowerShell

Configure the deployment values:

```powershell
$AWS_REGION = 'ap-south-1'
$AWS_PROFILE = 'default'
$IMAGE_TAG = Get-Date -Format 'yyyyMMddHHmmss'
$PUBLIC_API_URL = 'https://api.example.com/api/v1'

$AWS_ACCOUNT_ID = aws sts get-caller-identity `
  --profile $AWS_PROFILE `
  --query Account `
  --output text

$ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

Create the repositories once:

```powershell
aws ecr create-repository `
  --repository-name stockpilot-api `
  --image-scanning-configuration scanOnPush=true `
  --encryption-configuration encryptionType=AES256 `
  --region $AWS_REGION `
  --profile $AWS_PROFILE

aws ecr create-repository `
  --repository-name stockpilot-web `
  --image-scanning-configuration scanOnPush=true `
  --encryption-configuration encryptionType=AES256 `
  --region $AWS_REGION `
  --profile $AWS_PROFILE
```

Authenticate Docker with ECR:

```powershell
aws ecr get-login-password `
  --region $AWS_REGION `
  --profile $AWS_PROFILE |
  docker login `
    --username AWS `
    --password-stdin $ECR_REGISTRY
```

Build, tag, and push the API image:

```powershell
docker build `
  --platform linux/amd64 `
  --tag "stockpilot-api:$IMAGE_TAG" `
  .\backend

docker tag `
  "stockpilot-api:$IMAGE_TAG" `
  "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG"

docker push "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG"
```

Build, tag, and push the web image. Set `PUBLIC_API_URL` to the public HTTPS URL that will serve
the deployed API before running this build.

```powershell
docker build `
  --platform linux/amd64 `
  --build-arg "VITE_API_URL=$PUBLIC_API_URL" `
  --tag "stockpilot-web:$IMAGE_TAG" `
  .\frontend

docker tag `
  "stockpilot-web:$IMAGE_TAG" `
  "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"

docker push "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"
```

Display the image addresses to use in ECS/Fargate or App Runner:

```powershell
Write-Output "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG"
Write-Output "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"

aws ecr describe-images `
  --repository-name stockpilot-api `
  --region $AWS_REGION `
  --profile $AWS_PROFILE `
  --output table

aws ecr describe-images `
  --repository-name stockpilot-web `
  --region $AWS_REGION `
  --profile $AWS_PROFILE `
  --output table
```

### macOS/Linux

```bash
export AWS_REGION='ap-south-1'
export AWS_PROFILE='default'
export IMAGE_TAG="$(date +%Y%m%d%H%M%S)"
export PUBLIC_API_URL='https://api.example.com/api/v1'
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --query Account \
  --output text)"
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr create-repository \
  --repository-name stockpilot-api \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"

aws ecr create-repository \
  --repository-name stockpilot-web \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE"

aws ecr get-login-password \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" |
  docker login \
    --username AWS \
    --password-stdin "$ECR_REGISTRY"

docker build \
  --platform linux/amd64 \
  --tag "stockpilot-api:$IMAGE_TAG" \
  ./backend

docker tag \
  "stockpilot-api:$IMAGE_TAG" \
  "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG"

docker push "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG"

docker build \
  --platform linux/amd64 \
  --build-arg "VITE_API_URL=$PUBLIC_API_URL" \
  --tag "stockpilot-web:$IMAGE_TAG" \
  ./frontend

docker tag \
  "stockpilot-web:$IMAGE_TAG" \
  "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"

docker push "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"

printf '%s\n' \
  "$ECR_REGISTRY/stockpilot-api:$IMAGE_TAG" \
  "$ECR_REGISTRY/stockpilot-web:$IMAGE_TAG"

aws ecr describe-images \
  --repository-name stockpilot-api \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --output table

aws ecr describe-images \
  --repository-name stockpilot-web \
  --region "$AWS_REGION" \
  --profile "$AWS_PROFILE" \
  --output table
```

ECR stores the images but does not run them. Use the two printed image addresses in an Amazon ECS
Fargate task or App Runner service. Run PostgreSQL through Amazon RDS rather than inside the ECS
task, and provide the API service with `DATABASE_URL`, `JWT_SECRET`, `ACCESS_TOKEN_EXPIRE_MINUTES`,
and `CORS_ORIGINS` through its runtime environment or AWS Secrets Manager.

## Local development

### Hot-reload development with Docker

Use the development Compose file when actively editing the application. It bind-mounts the
source code, enables Vite hot-module replacement for React, and starts FastAPI with Uvicorn's
auto-reloader. You only need to rebuild when dependencies or a Dockerfile change.

Windows PowerShell:

```powershell
.\scripts\dev.ps1
```

macOS/Linux:

```bash
./scripts/dev.sh
```

Alternatively, run Compose directly:

```bash
docker compose -f docker-compose.dev.yml up --build
```

After the initial startup:

- Changes under `frontend/src/` update the browser through Vite HMR.
- Changes under `backend/app/` automatically restart the FastAPI worker.
- Refresh/rebuild is only needed after changing dependencies, Dockerfiles, or environment values.

Stop the development stack with:

```bash
docker compose -f docker-compose.dev.yml down
```

### Development without Docker

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
