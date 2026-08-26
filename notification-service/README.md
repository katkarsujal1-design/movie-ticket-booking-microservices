# Notification Service

Spring Boot 3 / Java 17 notification component for the Movie Ticket Booking system. It consumes booking and payment events from Kafka, makes processing idempotent using `event_id`, persists a notification, then sends an email (or logs it in local development).

## Architecture

`Kafka topic -> listener -> validation/handler -> notifications table -> email sender -> REST history API`.

The service has no database dependency on any other service. Kafka failures are retried twice with a one-second backoff, then published to `<original-topic>.DLT` (for example `booking-confirmed.DLT`) for investigation/replay.

## Topics and contract

Configured topics are `booking-confirmed`, `payment-success`, `payment-failed`, `booking-cancelled`, `refund-initiated`, and `refund-completed`; override them with `TOPIC_*` variables. Every event needs `eventId`, `userId`, and `userEmail`. Fields such as `movieName`, `theatreName`, `showTime`, `seats`, `amount`, `reason`, and `bookingId` are optional according to event type.

```json
{"eventId":"evt-1001","bookingId":"BK10001","userId":"USR1001","userEmail":"user@example.com","movieName":"Avengers","theatreName":"PVR Phoenix","showTime":"2026-08-30T19:30:00","seats":["A5","A6"],"amount":650.00,"status":"CONFIRMED","timestamp":"2026-08-26T10:30:00"}
```

The `notifications` table contains a unique `event_id`, user/booking lookup indexes, timestamps, delivery status, failure reason, and `read_at` for in-app read state. Hibernate creates/updates this schema at startup.

## APIs

- `GET /api/notifications?page=0&size=10`
- `GET /api/notifications/{id}`
- `GET /api/notifications/user/{userId}?page=0&size=10`
- `GET /api/notifications/booking/{bookingId}?page=0&size=10`
- `GET /api/notifications/user/{userId}/unread`
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/user/{userId}/read-all`

Responses are consistently `{success,message,data,errorCode,timestamp}`. Interactive OpenAPI is at `/swagger-ui.html`; health is `/actuator/health`.

```bash
curl http://localhost:3005/api/notifications/user/USR1001?page=0\&size=10
curl -X PATCH http://localhost:3005/api/notifications/1/read
docker exec -i movie-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:9092 --topic booking-confirmed
# Paste the JSON event above and press Enter.
```

## Configuration and run

Copy `.env.example` values into your environment. `MAIL_ENABLED=false` (the default) logs delivery safely and marks it sent. For SMTP set `MAIL_ENABLED=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM`; credentials are never stored in source.

```bash
cd notification-service
mvn clean test
mvn clean package
java -jar target/notification-service-1.0.0.jar
```

With the repository Compose stack:

```bash
docker compose up -d --build notification-service mysql kafka
curl http://localhost:3005/actuator/health
```

Common startup failures are unavailable MySQL/Kafka (start Compose dependencies first), invalid SMTP credentials (leave `MAIL_ENABLED=false` for development), or topic/name mismatches (set the `TOPIC_*` variable consistently with publishers). The current payment service publishes legacy dotted names such as `payment.success`; configure `TOPIC_PAYMENT_SUCCESS=payment.success` until that publisher contract is changed.
