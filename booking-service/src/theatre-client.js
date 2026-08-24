const config = require("./config");
const { AppError } = require("./errors");

async function getShow(movieId, showId) {
  let response;
  try {
    response = await fetch(`${config.theatreServiceUrl}/movies/${movieId}/shows`, { signal: AbortSignal.timeout(5000) });
  } catch (_error) {
    throw new AppError(503, "THEATRE_SERVICE_UNAVAILABLE", "Unable to validate the selected show");
  }
  if (!response.ok) throw new AppError(response.status === 404 ? 404 : 502, "SHOW_VALIDATION_FAILED", "Unable to validate the selected show");
  const shows = await response.json();
  const show = shows.find((candidate) => Number(candidate.show_id) === Number(showId));
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
  return show;
}

module.exports = { getShow };
