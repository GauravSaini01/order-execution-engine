# Order Execution Engine (Solana DEX Mock)

This project implements a high-throughput, real-time order execution engine using Node.js, Fastify, BullMQ, and PostgreSQL. It focuses on architecture, concurrent processing, and real-time status updates via WebSockets.

The core function is to process **Market Orders**, route them to the Decentralized Exchange (DEX) offering the best price, and stream the entire lifecycle to the client.

-----

## Architecture and Technology Stack

The system employs an event-driven, layered architecture designed for scalability and failure tolerance.

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **API/WebSockets** | **Fastify** | Handles incoming HTTP requests and maintains WebSocket connections for real-time status streaming. |
| **Queue** | **BullMQ** (with Redis) | Manages concurrent processing of orders, ensures concurrency limits, and handles exponential back-off retries. |
| **Persistence** | **PostgreSQL** | Stores all historical order data and final execution results persistently. |
| **Service Layer** | **OrderService**, **DexRouterService** | Implements core logic: order creation, price comparison, DEX routing, and status transitions. |
| **Worker** | **OrderWorker** | Consumes jobs from the queue and executes the asynchronous, multi-step execution flow. |

The decoupled architecture ensures that the primary web server remains highly responsive while complex, time-consuming tasks (like routing and execution) are handled reliably in the background worker pool.

-----

## Design Decisions

### Chosen Order Type: Market Order

The **Market Order** was chosen because it simplifies the initial logic by requiring immediate execution based on the best available price at the time of submission. This allowed the implementation to focus on the core requirements: **DEX Routing**, **Queue Concurrency**, **PostgreSQL Persistence**, and **WebSocket Status Streaming**, without the added complexity of continuous price monitoring required for Limit orders.

### Extension to Other Types (Limit/Sniper)

The current architecture is highly extensible for supporting other order types:

  * **Limit Order:** The `OrderWorker` would be modified to check the order's limit price against the current quote (via the `DexRouterService`). If the price condition is **not** met, the job is re-queued with an extended delay (e.g., 5 minutes) instead of throwing an error. This keeps the worker focused on immediate tasks while still managing persistent orders.
  * **Sniper Order:** This requires a new, dedicated **Monitoring Service** running outside the queue. This service would subscribe to blockchain events (e.g., a new token's liquidity pool creation). Upon detecting the target event, the monitor acts as an API client, submitting a standard **Market Order** job to the existing BullMQ queue via the `/api/orders/execute` endpoint.

-----

## Setup and Running Environment

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

# PostgreSQL 
DATABASE_URL="postgres://user:password@localhost:5432/order_engine_db"

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 3\. Start Services

Using the provided `docker-compose.yml` (which includes Redis for BullMQ and PostgreSQL for history):

```bash
docker compose up -d
```

### 4\. Database Migration (Create the `orders` table)

This step is mandatory to resolve the "relation "orders" does not exist" error.

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

### Running All Tests

To execute the entire test suite covering unit logic and integration flow, use the standard command:

```bash
npm run test
```