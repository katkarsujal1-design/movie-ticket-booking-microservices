# Booking Service

Node/Express service that owns bookings and show-scoped seat reservations. MySQL's unique active-reservation constraint is the final concurrency guard, and booking/event writes share one transaction through an outbox.

## API

- `POST /api/bookings`
- `GET /api/bookings/:bookingId`
- `GET /api/bookings/user/:userId`
- `PUT /api/bookings/:bookingId/cancel`
- `GET /api/shows/:showId/seats`
- `GET /health`

See `openapi.yaml` for the contract. A create request is:

```json
{"userId":101,"showId":25,"movieId":6,"theatreId":4,"seats":["A1","A2"]}
```

The service obtains the authoritative show and per-seat price from Theatre Service. Because Theatre Service does not currently expose a seat-layout API, the layout is configured using `SEAT_ROWS` (default `A,B,C,D,E,F,G,H`) and `SEATS_PER_ROW` (default `10`).

## Configuration

`PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` (or `DB_USERNAME`), `DB_PASSWORD`, `KAFKA_BROKER` (or `KAFKA_BOOTSTRAP_SERVERS`), `BOOKING_EVENTS_TOPIC`, `THEATRE_SERVICE_URL`, `SEAT_ROWS`, `SEATS_PER_ROW`, and `OUTBOX_POLL_INTERVAL_MS`.

## Events

The `booking-events` topic receives `BOOKING_CONFIRMED` and `BOOKING_CANCELLED`. Unpublished events remain in `booking_outbox` and are retried.

## Run

From the repository root: `docker compose up --build`. Run unit/API tests with `npm test` in this directory.
