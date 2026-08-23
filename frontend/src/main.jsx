import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL =
  import.meta.env.VITE_MOVIE_SERVICE_URL || "http://localhost:3001";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  const [hours, minutes] = value.split(":");
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(2026, 0, 1, Number(hours), Number(minutes)));
}

function getLowestPrice(shows) {
  if (shows.length === 0) {
    return null;
  }

  return Math.min(...shows.map((show) => Number(show.price)));
}

function groupShowsByTheatre(shows) {
  return shows.reduce((groups, show) => {
    const key = `${show.theatre_id}-${show.show_date}`;
    if (!groups[key]) {
      groups[key] = {
        theatre_id: show.theatre_id,
        theatre_name: show.theatre_name,
        city: show.city,
        location: show.location,
        show_date: show.show_date,
        shows: []
      };
    }
    groups[key].shows.push(show);
    return groups;
  }, {});
}

function App() {
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showsLoading, setShowsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMovies() {
      try {
        const response = await fetch(`${API_BASE_URL}/movies`);
        if (!response.ok) {
          throw new Error("Unable to load movies");
        }
        const data = await response.json();
        setMovies(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMovies();
  }, []);

  async function viewShows(movie) {
    setSelectedMovie(movie);
    setSelectedShowId(null);
    setShows([]);
    setShowsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}/shows`);
      if (!response.ok) {
        throw new Error("Unable to load shows");
      }
      const data = await response.json();
      setShows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setShowsLoading(false);
    }
  }

  const groupedShows = useMemo(
    () => Object.values(groupShowsByTheatre(shows)),
    [shows]
  );
  const lowestPrice = useMemo(() => getLowestPrice(shows), [shows]);
  const selectedShow = useMemo(
    () => shows.find((show) => show.show_id === selectedShowId),
    [selectedShowId, shows]
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Movie Ticket Booking</p>
          <h1>Movie Theatre Service</h1>
          <p className="hero-copy">
            Browse movies, compare theatres, and pick a show timing before
            continuing to booking later.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{movies.length}</strong>
            <span>Movies</span>
          </div>
          <div>
            <strong>Pune</strong>
            <span>City</span>
          </div>
          <div>
            <strong>{selectedShowId || "--"}</strong>
            <span>Show ID</span>
          </div>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      <section className="content-grid">
        <div className="movies-panel">
          <div className="section-heading">
            <h2>Movies</h2>
            <span>{movies.length} available</span>
          </div>

          {loading ? (
            <p className="muted">Loading movies...</p>
          ) : (
            <div className="movie-grid">
              {movies.map((movie, index) => (
                <article
                  className={`movie-card ${
                    selectedMovie?.id === movie.id ? "selected" : ""
                  }`}
                  key={movie.id}
                >
                  <div className="poster-wrap">
                    <img src={movie.poster_url} alt={movie.title} />
                    <span className="poster-rank">#{index + 1}</span>
                  </div>
                  <div className="movie-card-body">
                    <h3>{movie.title}</h3>
                    <p>{movie.language}</p>
                    <div className="movie-meta">
                      <span>{movie.genre}</span>
                      <span>{movie.duration}</span>
                    </div>
                    <button type="button" onClick={() => viewShows(movie)}>
                      View Shows
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="shows-panel">
          {!selectedMovie ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true"></span>
              <h2>Select a movie</h2>
              <p>Choose a movie to view available theatres and show timings.</p>
            </div>
          ) : (
            <>
              <div className="movie-detail">
                <img src={selectedMovie.poster_url} alt={selectedMovie.title} />
                <div>
                  <p className="eyebrow">Now showing</p>
                  <h2>{selectedMovie.title}</h2>
                  <p>{selectedMovie.description}</p>
                  <div className="movie-meta detail-meta">
                    <span>{selectedMovie.language}</span>
                    <span>{selectedMovie.genre}</span>
                    <span>{selectedMovie.duration}</span>
                    {lowestPrice && <span>From Rs. {lowestPrice}</span>}
                  </div>
                </div>
              </div>

              {selectedShowId && (
                <div className="selected-show">
                  <div>
                    <span>Selected show</span>
                    <strong>{selectedShowId}</strong>
                  </div>
                  {selectedShow && (
                    <p>
                      {selectedShow.theatre_name}, {formatDate(selectedShow.show_date)} at{" "}
                      {formatTime(selectedShow.show_time)}
                    </p>
                  )}
                </div>
              )}

              {showsLoading ? (
                <p className="muted">Loading shows...</p>
              ) : groupedShows.length === 0 ? (
                <p className="muted">No shows available for this movie.</p>
              ) : (
                <div className="theatre-list">
                  {groupedShows.map((group) => (
                    <article
                      className="theatre-card"
                      key={`${group.theatre_id}-${group.show_date}`}
                    >
                      <div className="theatre-heading">
                        <div>
                          <h3>{group.theatre_name}</h3>
                          <p>
                            {group.location}, {group.city}
                          </p>
                        </div>
                        <span>{formatDate(group.show_date)}</span>
                      </div>
                      <div className="show-buttons">
                        {group.shows.map((show) => (
                          <button
                            type="button"
                            className={
                              selectedShowId === show.show_id ? "active" : ""
                            }
                            key={show.show_id}
                            onClick={() => setSelectedShowId(show.show_id)}
                          >
                            {formatTime(show.show_time)}
                            <span>Rs. {show.price}</span>
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
