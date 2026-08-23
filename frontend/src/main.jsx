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

function getLowestPrice(shows) {
  if (shows.length === 0) {
    return null;
  }

  return Math.min(...shows.map((show) => Number(show.price)));
}

function handlePosterError(event, title) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = `https://placehold.co/500x750/111827/ffffff?text=${encodeURIComponent(
    title
  )}`;
}

function App() {
  const [movies, setMovies] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [selectedShowId, setSelectedShowId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showsLoading, setShowsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [moviesResponse, citiesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/movies`),
          fetch(`${API_BASE_URL}/cities`)
        ]);

        if (!moviesResponse.ok || !citiesResponse.ok) {
          throw new Error("Unable to load movie data");
        }

        setMovies(await moviesResponse.json());
        setCities(await citiesResponse.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  async function loadShows(movie, city = selectedCity) {
    setSelectedMovie(movie);
    setSelectedShowId(null);
    setShows([]);
    setShowsLoading(true);
    setError("");

    try {
      const cityQuery =
        city && city !== "All" ? `?city=${encodeURIComponent(city)}` : "";
      const response = await fetch(
        `${API_BASE_URL}/movies/${movie.id}/shows${cityQuery}`
      );

      if (!response.ok) {
        throw new Error("Unable to load shows");
      }

      setShows(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setShowsLoading(false);
    }
  }

  function handleCityChange(event) {
    const nextCity = event.target.value;
    setSelectedCity(nextCity);

    if (selectedMovie) {
      loadShows(selectedMovie, nextCity);
    }
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCity("All");
    setSelectedGenre("All");
    setSelectedLanguage("All");

    if (selectedMovie) {
      loadShows(selectedMovie, "All");
    }
  }

  const genres = useMemo(
    () => ["All", ...new Set(movies.map((movie) => movie.genre))],
    [movies]
  );
  const languages = useMemo(
    () => ["All", ...new Set(movies.map((movie) => movie.language))],
    [movies]
  );
  const cityOptions = useMemo(() => ["All", ...cities], [cities]);

  const filteredMovies = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return movies.filter((movie) => {
      const matchesSearch =
        !normalizedSearch ||
        movie.title.toLowerCase().includes(normalizedSearch) ||
        movie.genre.toLowerCase().includes(normalizedSearch) ||
        movie.language.toLowerCase().includes(normalizedSearch);
      const matchesGenre =
        selectedGenre === "All" || movie.genre === selectedGenre;
      const matchesLanguage =
        selectedLanguage === "All" || movie.language === selectedLanguage;

      return matchesSearch && matchesGenre && matchesLanguage;
    });
  }, [movies, searchText, selectedGenre, selectedLanguage]);

  const groupedShows = useMemo(
    () => Object.values(groupShowsByTheatre(shows)),
    [shows]
  );
  const lowestPrice = useMemo(() => getLowestPrice(shows), [shows]);
  const selectedShow = useMemo(
    () => shows.find((show) => show.show_id === selectedShowId),
    [selectedShowId, shows]
  );
  const featuredMovie = selectedMovie || movies[0];

  return (
    <main className="app-shell">
      <nav className="site-nav">
        <div className="brand-mark">
          <span>MT</span>
          <strong>MovieTheatre</strong>
        </div>
        <div className="nav-links">
          <span>Movies</span>
          <span>Theatres</span>
          <span>Shows</span>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Movie Ticket Booking</p>
          <h1>Find shows across your favourite city theatres</h1>
          <p className="hero-copy">
            Explore movies, filter by city and category, then select a show ID
            that can continue to Booking Service later.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{movies.length}</strong>
            <span>Movies</span>
          </div>
          <div>
            <strong>{cities.length}</strong>
            <span>Cities</span>
          </div>
          <div>
            <strong>{selectedShowId || "--"}</strong>
            <span>Selected Show</span>
          </div>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      {featuredMovie && (
        <section className="featured-strip">
          <img
            src={featuredMovie.poster_url}
            alt={featuredMovie.title}
            onError={(event) => handlePosterError(event, featuredMovie.title)}
          />
          <div>
            <p className="eyebrow dark">Featured selection</p>
            <h2>{featuredMovie.title}</h2>
            <p>{featuredMovie.description}</p>
          </div>
          <button type="button" onClick={() => loadShows(featuredMovie)}>
            View Shows
          </button>
        </section>
      )}

      <section className="filter-bar">
        <label>
          <span>Search</span>
          <input
            type="search"
            placeholder="Movie, genre, language"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
        <label>
          <span>City</span>
          <select value={selectedCity} onChange={handleCityChange}>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Genre</span>
          <select
            value={selectedGenre}
            onChange={(event) => setSelectedGenre(event.target.value)}
          >
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Language</span>
          <select
            value={selectedLanguage}
            onChange={(event) => setSelectedLanguage(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ghost-button" onClick={clearFilters}>
          Reset
        </button>
      </section>

      <section className="city-chips" aria-label="City filters">
        {cityOptions.map((city) => (
          <button
            type="button"
            className={selectedCity === city ? "active" : ""}
            key={city}
            onClick={() => {
              setSelectedCity(city);
              if (selectedMovie) {
                loadShows(selectedMovie, city);
              }
            }}
          >
            {city}
          </button>
        ))}
      </section>

      <section className="content-grid">
        <div className="movies-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">Now showing</p>
              <h2>Movies</h2>
            </div>
            <span>{filteredMovies.length} found</span>
          </div>

          {loading ? (
            <p className="muted">Loading movies...</p>
          ) : filteredMovies.length === 0 ? (
            <p className="muted">No movies match your filters.</p>
          ) : (
            <div className="movie-grid">
              {filteredMovies.map((movie, index) => (
                <article
                  className={`movie-card ${
                    selectedMovie?.id === movie.id ? "selected" : ""
                  }`}
                  key={movie.id}
                >
                  <div className="poster-wrap">
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      onError={(event) => handlePosterError(event, movie.title)}
                    />
                    <span className="poster-rank">#{index + 1}</span>
                  </div>
                  <div className="movie-card-body">
                    <h3>{movie.title}</h3>
                    <p>{movie.language}</p>
                    <div className="movie-meta">
                      <span>{movie.genre}</span>
                      <span>{movie.duration}</span>
                    </div>
                    <button type="button" onClick={() => loadShows(movie)}>
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
              <p>Choose a movie to view theatres, timing, and price.</p>
            </div>
          ) : (
            <>
              <div className="movie-detail">
                <img
                  src={selectedMovie.poster_url}
                  alt={selectedMovie.title}
                  onError={(event) =>
                    handlePosterError(event, selectedMovie.title)
                  }
                />
                <div>
                  <p className="eyebrow dark">Selected movie</p>
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
                      {selectedShow.theatre_name},{" "}
                      {formatDate(selectedShow.show_date)} at{" "}
                      {formatTime(selectedShow.show_time)}
                    </p>
                  )}
                </div>
              )}

              {showsLoading ? (
                <p className="muted">Loading shows...</p>
              ) : groupedShows.length === 0 ? (
                <p className="muted">No shows available for this city.</p>
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
