# 🚀 Order Execution Engine Documentation

## Overview

This project implements a high-throughput, real-time order execution engine using Node.js, Fastify, BullMQ, and PostgreSQL. It focuses on architecture, concurrent processing, and real-time status updates via WebSockets. The core function is to process **Market Orders** by routing them to the Decentralized Exchange (DEX) offering the best price and streaming the entire lifecycle to the client dashboard.

-----

## 🌐 Deployed Application Links

**LIVE DEMO:**

| Service | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Dashboard** | [https://eterna-assignment-msr8ggbmr-gaurav-sainis-projects-8476e8e0.vercel.app](https://eterna-assignment-msr8ggbmr-gaurav-sainis-projects-8476e8e0.vercel.app) | Hosted on Vercel |
| **Frontend Repo** | [https://github.com/GauravSaini01/frontend-eterna-assignment](https://github.com/GauravSaini01/frontend-eterna-assignment) | **Frontend Source Code** |
| **Backend API Base** | [https://order-execution-engine-1.onrender.com/api](https://www.google.com/search?q=https://order-execution-engine-1.onrender.com/api) | Hosted on Render (Fastify Web Service) |

-----

## ⚙️ 2. Architecture and Technology Stack

The system employs an event-driven, layered architecture designed for scalability and failure tolerance.

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **API/WebSockets** | **Fastify** | Handles incoming HTTP requests (`/api/orders`) and maintains WebSocket connections for real-time status streaming. |
| **Queue** | **BullMQ** (with Redis) | Manages concurrent processing of orders, ensures concurrency limits, and handles exponential back-off retries. |
| **Persistence** | **PostgreSQL** | Stores all historical order data and final execution results persistently. |
| **Service Layer** | **OrderService**, **DexRouterService** | Implements core logic: order creation, price comparison, DEX routing (Raydium vs. Meteora Mock), and status transitions. |
| **Worker** | **OrderWorker** | Consumes jobs from the queue and executes the asynchronous, multi-step execution flow. |

-----

## 🎯 3. Design Decisions

### Chosen Order Type: Market Order

The **Market Order** was chosen because it simplifies the initial logic by requiring immediate execution based on the best available price at the time of submission. This allowed the implementation to focus on the core requirements: **DEX Routing**, **Queue Concurrency**, **PostgreSQL Persistence**, and **WebSocket Status Streaming**.

### Extension to Other Types (Limit/Sniper)

The current architecture is highly extensible for supporting other order types:

  * **Limit Order:** The `OrderWorker` would check the order's limit price. If the condition is **not** met, the job is **re-queued with an extended delay** (e.g., 5 minutes) instead of being dropped, allowing the worker to manage persistent orders.
  * **Sniper Order:** This requires a new, dedicated **Monitoring Service** running outside the queue. This service would subscribe to blockchain events (e.g., a new token's liquidity pool creation) and submit a standard **Market Order** job to the existing BullMQ queue.

-----

## 🌐 4. API Documentation and Endpoints

### Backend Endpoints

The backend exposes the following endpoints under the base path `/api`.

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/orders/execute` | **Submit Order.** Creates a new market order, saves it to PostgreSQL, and enqueues it for processing. | `{"type": "market", "tokenIn": "SOL", "tokenOut": "USDC", "amount": 10}` |
| **`GET`** | `/api/orders` | **Order History.** Retrieves a list of all historical orders from the PostgreSQL database. | Returns `[{ id: 'uuid', status: 'CONFIRMED', ... }]` |
| **`GET`** | `/health` | **Status Check.** Confirms the Fastify server is running and responsive. | Returns `{ status: "ok", timestamp: [timestamp] }` |
| **`WS`** | `/api/orders/ws?orderId=<id>` | **Status Stream.** Establishes a WebSocket connection to receive real-time lifecycle updates. | Updates include `status` and `payload` (e.g., `txHash`). |

-----

## 🛠️ 5. Setup and Running Environment

This project requires Node.js, Redis, and PostgreSQL. Docker is highly recommended for managing the services.

### Prerequisites

1.  **Node.js** (v18+)
2.  **Docker** (Installed and running)

### 0\. Clone the Repository

Clone the project repository and navigate into the directory:

```bash
git clone <YOUR_REPOSITORY_LINK_HERE>
cd order-execution-engine
```

### 1\. Install Dependencies

Install all required core packages and development tools:

```bash
npm install
```

### 2\. Configuration (`.env`)

You need to create a `.env` file for your application environment variables.

| Command | Purpose |
| :--- | :--- |
| `cp .env.example .env` | Creates the required local environment file. |

Ensure your `.env` file reflects the credentials used in your Docker setup:

```dotenv
PORT=3000

# PostgreSQL (Matches docker-compose.yml defaults)
DATABASE_URL="postgres://user:password@localhost:5432/order_engine_db"

# Redis (Matches docker-compose.yml defaults)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 3\. Start Services

Using the provided `docker-compose.yml` (which includes Redis for BullMQ and PostgreSQL for history):

```bash
docker compose up -d
```

### 4\. Database Migration (Create the `orders` table)

This step is **mandatory** to resolve the "relation "orders" does not exist" error.

Connect to the PostgreSQL container shell:

```bash
docker exec -it order_db psql -U user -d order_engine_db
```

Execute the table creation SQL:

```sql
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    token_in VARCHAR(50) NOT NULL,
    token_out VARCHAR(50) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status VARCHAR(50) NOT NULL,
    chosen_dex VARCHAR(50),
    tx_hash VARCHAR(100),
    executed_price NUMERIC(20, 8),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

Exit the shell (`\q`).

### 5\. Start the Application

Run the Node.js application and worker process:

```bash
npm run dev
```

### 6\. Access the Dashboard

Open the frontend dashboard in your browser. The Order History will now load successfully, and you can place orders via the form:

`http://127.0.0.1:5500/index.html`

-----

## 🧪 6. Testing

### Running All Tests

To execute the entire test suite covering unit logic and integration flow, use the standard command:

```bash
npm run test
```

### Concurrent Processing

The `order-queue` is managed by BullMQ with a configured concurrency limit (default 10). Jobs failing during execution will be automatically retried up to **3 times** using an **exponential back-off** strategy before the final `failed` status is emitted.