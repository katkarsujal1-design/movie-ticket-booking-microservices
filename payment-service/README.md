# Payment Service

Standalone Payment Service for the Movie Ticket Booking System. It receives payment requests from the Booking Service, simulates payment processing, stores payment records in its own MySQL database, and publishes payment events to Kafka when available.

## Stack

- Node.js
- Express.js
- MySQL with `mysql2/promise`
- Kafka with `kafkajs`
- Docker and Docker Compose

## Structure

```text
payment-service/
├── migrations/
│   └── 001_create_payment_schema.sql
├── src/
│   ├── config/
│   ├── controllers/
│   ├── kafka/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
├── server.js
├── package.json
├── Dockerfile
├── .env.example
└── README.md
```

## Environment

Copy `.env.example` and adjust values if running outside Docker.

```env
PORT=3003
DB_HOST=payment-db
DB_PORT=3306
DB_NAME=payment_db
DB_USER=root
DB_PASSWORD=root
PAYMENT_SIMULATION_MODE=random
KAFKA_BROKER=kafka:9092
```

`PAYMENT_SIMULATION_MODE` supports:

- `success`: every payment succeeds
- `failure`: every payment fails
- `random`: 90 percent success, 10 percent failure

## Database

The service owns the `payments` table in its own `payment-db` database. The table is created automatically during startup from `migrations/001_create_payment_schema.sql`.

Statuses:

- `PENDING`
- `PROCESSING`
- `SUCCESS`
- `FAILED`
- `REFUNDED`

Payment methods:

- `UPI`
- `CARD`
- `NET_BANKING`
- `WALLET`
- `CASH`

## Run With Docker

```bash
docker compose build payment-service
docker compose up -d payment-db kafka payment-service
```

The service is available at `http://localhost:3003`.

## Run Locally

```bash
cd payment-service
npm install
npm start
```

Make sure MySQL is running and the database variables point to it.

## APIs

### Health

```bash
curl http://localhost:3003/health
```

### Create Payment

```bash
curl -X POST http://localhost:3003/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "BOOK-1001",
    "userId": "USER-101",
    "amount": 450,
    "currency": "INR",
    "paymentMethod": "UPI"
  }'
```

### List Payments

```bash
curl "http://localhost:3003/api/payments?page=1&limit=20"
curl "http://localhost:3003/api/payments?status=SUCCESS"
curl "http://localhost:3003/api/payments?paymentMethod=UPI"
```

### Get Payment

```bash
curl http://localhost:3003/api/payments/PAY-1723456789-4821
```

### Get Payment By Booking

```bash
curl http://localhost:3003/api/payments/booking/BOOK-1001
```

### Get Payment Status

```bash
curl http://localhost:3003/api/payments/PAY-1723456789-4821/status
```

### Refund

```bash
curl -X POST http://localhost:3003/api/payments/PAY-1723456789-4821/refund
```

Only `SUCCESS` payments can be refunded. A refunded payment cannot be refunded again.

## Kafka Events

Kafka publishing is best-effort. The service logs Kafka errors and continues running if Kafka is temporarily unavailable.

Topics:

- `payment.success`
- `payment.failed`
- `payment.refunded`

## Troubleshooting

- If the service cannot connect to MySQL, check `DB_HOST`, `DB_PORT`, and whether `payment-db` is healthy.
- If Docker Hub times out while building, run `docker pull node:20-alpine` and retry.
- Use `PAYMENT_SIMULATION_MODE=success` for deterministic demos and API tests.
