import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL =
  import.meta.env.VITE_MOVIE_SERVICE_URL || "http://localhost:3001";
const BOOKING_API_URL =
  import.meta.env.VITE_BOOKING_SERVICE_URL || "http://localhost:3002";
const PAYMENT_API_URL =
  import.meta.env.VITE_PAYMENT_SERVICE_URL || "http://localhost:3003";
const NOTIFICATION_API_URL =
  import.meta.env.VITE_NOTIFICATION_SERVICE_URL || "http://localhost:3005";

const PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET", "CASH"];

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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
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
  const [userId, setUserId] = useState("101");
  const [seatAvailability, setSeatAvailability] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [latestBooking, setLatestBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

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

  useEffect(() => {
    if (!selectedShowId) {
      setSeatAvailability([]);
      setSelectedSeats([]);
      return;
    }

    loadSeats(selectedShowId);
  }, [selectedShowId]);

  async function readResponse(response) {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || "The request could not be completed");
    }
    return body;
  }

  async function loadSeats(showId) {
    setSeatsLoading(true);
    setSelectedSeats([]);
    setBookingMessage("");
    try {
      const response = await fetch(`${BOOKING_API_URL}/api/shows/${showId}/seats`);
      const body = await readResponse(response);
      setSeatAvailability(body.seats);
    } catch (err) {
      setBookingMessage(err.message);
    } finally {
      setSeatsLoading(false);
    }
  }

  function toggleSeat(seat) {
    if (seat.status === "BOOKED") return;
    setSelectedSeats((current) =>
      current.includes(seat.seatNumber)
        ? current.filter((number) => number !== seat.seatNumber)
        : [...current, seat.seatNumber]
    );
  }

  async function createBooking() {
    if (!selectedMovie || !selectedShow || selectedSeats.length === 0) return;
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      setBookingMessage("Enter a valid positive user ID.");
      return;
    }
    setBookingLoading(true);
    setBookingMessage("");
    try {
      const response = await fetch(`${BOOKING_API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parsedUserId,
          showId: selectedShow.show_id,
          movieId: selectedMovie.id,
          theatreId: selectedShow.theatre_id,
          seats: selectedSeats
        })
      });
      const booking = await readResponse(response);
      setLatestBooking(booking);
      setPaymentResult(null);
      setPaymentMessage("");
      setBookingMessage(`Booking ${booking.bookingReference} confirmed.`);
      await Promise.all([loadSeats(selectedShowId), loadUserBookings(parsedUserId)]);
    } catch (err) {
      setBookingMessage(err.message);
      await loadSeats(selectedShowId);
    } finally {
      setBookingLoading(false);
    }
  }

  async function loadUserBookings(id = Number(userId)) {
    if (!Number.isInteger(id) || id <= 0) {
      setBookingMessage("Enter a valid positive user ID.");
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await fetch(`${BOOKING_API_URL}/api/bookings/user/${id}`);
      setUserBookings(await readResponse(response));
    } catch (err) {
      setBookingMessage(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadNotifications(id = userId) {
    if (!String(id).trim()) {
      setNotificationMessage("Enter a user ID to load notifications.");
      return;
    }
    setNotificationsLoading(true);
    setNotificationMessage("");
    try {
      const response = await fetch(`${NOTIFICATION_API_URL}/api/notifications/user/${encodeURIComponent(id)}?page=0&size=20`);
      const body = await readResponse(response);
      setNotifications(body.data?.content || []);
    } catch (err) {
      setNotificationMessage(`${err.message}. Make sure Notification Service is running on port 3005.`);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationRead(notificationId) {
    try {
      const response = await fetch(`${NOTIFICATION_API_URL}/api/notifications/${notificationId}/read`, { method: "PATCH" });
      const body = await readResponse(response);
      setNotifications((current) => current.map((item) => item.id === notificationId ? body.data : item));
    } catch (err) {
      setNotificationMessage(err.message);
    }
  }

  async function cancelBooking(bookingId) {
    setBookingMessage("");
    try {
      const response = await fetch(`${BOOKING_API_URL}/api/bookings/${bookingId}/cancel`, { method: "PUT" });
      const booking = await readResponse(response);
      setLatestBooking(booking);
      setBookingMessage(`Booking ${booking.bookingReference} cancelled.`);
      await Promise.all([loadUserBookings(Number(userId)), selectedShowId ? loadSeats(selectedShowId) : Promise.resolve()]);
    } catch (err) {
      setBookingMessage(err.message);
    }
  }

  async function processPayment() {
    if (!latestBooking || latestBooking.status !== "CONFIRMED") {
      setPaymentMessage("Create a confirmed booking before payment.");
      return;
    }

    setPaymentLoading(true);
    setPaymentMessage("");
    setPaymentResult(null);

    try {
      const response = await fetch(`${PAYMENT_API_URL}/api/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: latestBooking.bookingReference,
          userId: String(latestBooking.userId),
          amount: Number(latestBooking.totalAmount),
          currency: "INR",
          paymentMethod
        })
      });
      const body = await readResponse(response);
      setPaymentResult(body.payment);
      setPaymentMessage(body.message);
    } catch (err) {
      setPaymentMessage(err.message);
    } finally {
      setPaymentLoading(false);
    }
  }

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
  const seatRows = useMemo(
    () =>
      seatAvailability.reduce((rows, seat) => {
        const row = seat.seatNumber.match(/^[A-Z]+/)?.[0] || "";
        if (!rows[row]) rows[row] = [];
        rows[row].push(seat);
        return rows;
      }, {}),
    [seatAvailability]
  );
  const availableSeatCount = useMemo(
    () => seatAvailability.filter((seat) => seat.status === "AVAILABLE").length,
    [seatAvailability]
  );
  const featuredMovie = selectedMovie || movies[0];

  return (
    <main className="app-shell">
      <nav className="site-nav">
        <div className="brand-mark">
          <span>BT</span>
          <strong>BookMyTicket</strong>
        </div>
        <div className="nav-links">
          <a href="#movies">Movies</a>
          <a href="#booking">Booking</a>
          <a href="#history">History</a>
          <a href="#notifications">Notifications</a>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Movie Ticket Booking</p>
          <h1>Find shows across your favourite city theatres</h1>
          <p className="hero-copy">
            Explore movies, pick seats, confirm your booking, and complete a
            simulated payment from one clean flow.
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
          <div>
            <strong>{paymentResult?.status || "--"}</strong>
            <span>Payment</span>
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

      <section className="content-grid" id="movies">
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
                    {lowestPrice && <span>From {formatCurrency(lowestPrice)}</span>}
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
                            <span>{formatCurrency(show.price)}</span>
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

      <section className="booking-workspace" id="booking">
        <div className="booking-panel">
          <div className="booking-heading">
            <div>
              <p className="booking-kicker">Seat selection</p>
              <h2>{selectedShow ? "Pick the perfect seats" : "Choose a show to begin"}</h2>
              <p>{selectedShow ? `${selectedShow.theatre_name} · ${formatDate(selectedShow.show_date)} · ${formatTime(selectedShow.show_time)}` : "Your cinema seating plan will appear here."}</p>
            </div>
            {selectedShow && (
              <div className="availability-badge">
                <strong>{availableSeatCount}</strong>
                <span>available</span>
              </div>
            )}
          </div>

          {!selectedShow ? (
            <p className="muted">Select a movie and show above to view its seats.</p>
          ) : seatsLoading ? (
            <p className="muted">Loading seat availability...</p>
          ) : (
            <>
              <div className="cinema-screen">
                <span>SCREEN THIS WAY</span>
              </div>
              <div className="seat-map" aria-label="Seat selection">
                {Object.entries(seatRows).map(([row, seats]) => (
                  <div className="seat-row" key={row}>
                    <span className="row-label">{row}</span>
                    <div className="row-seats">
                      {seats.map((seat) => (
                        <button
                          type="button"
                          key={seat.seatNumber}
                          disabled={seat.status === "BOOKED"}
                          className={`${seat.status.toLowerCase()} ${selectedSeats.includes(seat.seatNumber) ? "selected" : ""}`}
                          onClick={() => toggleSeat(seat)}
                          aria-pressed={selectedSeats.includes(seat.seatNumber)}
                          title={`${seat.seatNumber}: ${seat.status}`}
                        >
                          {seat.seatNumber.replace(row, "")}
                        </button>
                      ))}
                    </div>
                    <span className="row-label">{row}</span>
                  </div>
                ))}
              </div>
              <div className="seat-legend">
                <span><i className="available" />Available</span>
                <span><i className="selected" />Selected</span>
                <span><i className="booked" />Booked</span>
              </div>
            </>
          )}
        </div>

        <aside className="booking-summary">
          <div className="summary-heading">
            <span>Booking summary</span>
            <i>{selectedSeats.length}</i>
          </div>
          <h2>{selectedMovie?.title || "No movie selected"}</h2>
          {selectedShow && (
            <div className="summary-details">
              <p><span>Theatre</span><strong>{selectedShow.theatre_name}</strong></p>
              <p><span>Date</span><strong>{formatDate(selectedShow.show_date)}</strong></p>
              <p><span>Time</span><strong>{formatTime(selectedShow.show_time)}</strong></p>
              <p><span>Seats</span><strong>{selectedSeats.join(", ") || "Select seats"}</strong></p>
              <p className="summary-total"><span>Total</span><strong>{formatCurrency(Number(selectedShow.price) * selectedSeats.length)}</strong></p>
            </div>
          )}
          <label className="user-field">
            <span>User ID</span>
            <input type="number" min="1" value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
          <button
            type="button"
            className="book-button"
            disabled={!selectedShow || selectedSeats.length === 0 || bookingLoading}
            onClick={createBooking}
          >
            {bookingLoading ? "Confirming..." : `Confirm ${selectedSeats.length || ""} ${selectedSeats.length === 1 ? "Seat" : "Seats"}`}
          </button>
          {bookingMessage && <p className="booking-message">{bookingMessage}</p>}
          {latestBooking && (
            <div className={`booking-receipt ${latestBooking.status.toLowerCase()}`}>
              <span>{latestBooking.status}</span>
              <strong>{latestBooking.bookingReference}</strong>
              <small>Booking #{latestBooking.id}</small>
            </div>
          )}
          {latestBooking?.status === "CONFIRMED" && (
            <div className="payment-box">
              <div className="summary-heading">
                <span>Payment</span>
                <i>Rs</i>
              </div>
              <p className="payment-amount">
                <span>Payable</span>
                <strong>{formatCurrency(latestBooking.totalAmount)}</strong>
              </p>
              <label className="user-field">
                <span>Payment method</span>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="pay-button"
                disabled={paymentLoading || paymentResult?.status === "SUCCESS" || paymentResult?.status === "REFUNDED"}
                onClick={processPayment}
              >
                {paymentLoading ? "Processing..." : paymentResult?.status === "SUCCESS" ? "Paid" : `Pay ${formatCurrency(latestBooking.totalAmount)}`}
              </button>
              {paymentMessage && (
                <p className={`payment-message ${paymentResult?.status?.toLowerCase() || ""}`}>
                  {paymentMessage}
                </p>
              )}
              {paymentResult && (
                <div className={`payment-receipt ${paymentResult.status.toLowerCase()}`}>
                  <span>{paymentResult.status}</span>
                  <strong>{paymentResult.paymentId}</strong>
                  {paymentResult.transactionId && <small>{paymentResult.transactionId}</small>}
                  {paymentResult.failureReason && <small>{paymentResult.failureReason}</small>}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="history-panel" id="history">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Your account</p>
            <h2>Booking history</h2>
          </div>
          <button type="button" className="history-button" onClick={() => loadUserBookings()} disabled={historyLoading}>
            {historyLoading ? "Loading..." : "Load bookings"}
          </button>
        </div>
        {userBookings.length === 0 ? (
          <p className="muted">Enter a user ID and load bookings, or complete a new booking.</p>
        ) : (
          <div className="booking-list">
            {userBookings.map((booking) => (
              <article key={booking.id}>
                <div>
                  <span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span>
                  <h3>{booking.bookingReference}</h3>
                  <p>Show #{booking.showId} · {booking.seats.map((seat) => seat.seatNumber).join(", ")}</p>
                </div>
                <div className="booking-list-actions">
                  <strong>{formatCurrency(booking.totalAmount)}</strong>
                  {booking.status !== "CANCELLED" && (
                    <button type="button" onClick={() => cancelBooking(booking.id)}>Cancel</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="history-panel notification-panel" id="notifications">
        <div className="section-heading">
          <div><p className="eyebrow dark">Your account</p><h2>Notifications</h2></div>
          <button type="button" className="history-button" onClick={() => loadNotifications()} disabled={notificationsLoading}>
            {notificationsLoading ? "Loading..." : "Load notifications"}
          </button>
        </div>
        {notificationMessage && <p className="notification-message">{notificationMessage}</p>}
        {notifications.length === 0 ? <p className="muted">Load notifications for the User ID entered in the booking summary.</p> : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className={notification.readAt ? "read" : "unread"} key={notification.id}>
                <div>
                  <span className={`status-pill ${notification.status.toLowerCase()}`}>{notification.notificationType.replaceAll("_", " ")}</span>
                  <h3>{notification.subject}</h3>
                  <p>{notification.bookingId ? `Booking ${notification.bookingId} · ` : ""}{new Date(notification.createdAt).toLocaleString("en-IN")}</p>
                </div>
                {!notification.readAt && <button type="button" onClick={() => markNotificationRead(notification.id)}>Mark read</button>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
