# Movie Ticket Booking Microservices

A small college-level movie ticket booking microservices project.

Includes movie/show discovery and a complete React seat-booking flow.

## Services

- movie-theatre-service on port 3001
- booking-service on port 3002
- payment-service on port 3003
- notification-service on port 3004
- MySQL 8.4
- Apache Kafka in KRaft mode
- React frontend on port 5173

## Movie-Theatre APIs

- `GET /health`
- `GET /movies`
- `GET /movies/:id`
- `GET /movies/:movieId/shows`
- `GET /movies/:movieId/shows?city=Pune`
- `POST /movies`
- `POST /theatres`
- `POST /shows`

## Run With Docker Compose

```bash
docker compose up -d --build
docker compose ps
```

## Check Backend

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/movies
curl http://127.0.0.1:3001/movies/1
curl http://127.0.0.1:3001/movies/1/shows
```

## Booking Flow

Open `http://localhost:5173`, choose a movie and show, select available seats,
enter a user ID, and confirm the booking. The same page also displays booking
history and supports cancellation.

Booking Service runs at `http://localhost:3002` and exposes seat availability,
booking creation, history, retrieval, and cancellation APIs.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend uses this API URL by default:

```text
http://localhost:3001
```

To override it, create `frontend/.env`:

```text
VITE_MOVIE_SERVICE_URL=http://localhost:3001
VITE_BOOKING_SERVICE_URL=http://localhost:3002
```

## Stop Containers

```bash
docker compose down
```
