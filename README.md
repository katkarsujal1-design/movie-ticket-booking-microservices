# Movie Ticket Booking Microservices

A small college-level movie ticket booking microservices project.

Current focus: Movie-Theatre Service backend and React UI.

## Services

- movie-theatre-service on port 3001
- booking-service on port 3002
- payment-service on port 3003
- notification-service on port 3004
- MySQL 8.4
- Apache Kafka in KRaft mode

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
```

## Stop Containers

```bash
docker compose down
```
