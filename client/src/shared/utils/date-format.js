const LOCALES_BY_FORMAT = {
  "month-day-year": "en-US",
  "day-month-year": "en-GB",
  "year-month-day": "en-CA",
};

function getLocale(preferences = {}) {
  return (
    LOCALES_BY_FORMAT[preferences.dateFormat] ??
    "en-US"
  );
}

function getTimezone(preferences = {}) {
  return preferences.timezone ?? "UTC";
}

export function formatDate(value, preferences) {
  return new Intl.DateTimeFormat(
    getLocale(preferences),
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: getTimezone(preferences),
    },
  ).format(new Date(value));
}

export function formatDateTime(value, preferences) {
  return new Intl.DateTimeFormat(
    getLocale(preferences),
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: getTimezone(preferences),
    },
  ).format(new Date(value));
}

export function formatTime(value, preferences) {
  return new Intl.DateTimeFormat(
    getLocale(preferences),
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: getTimezone(preferences),
    },
  ).format(new Date(value));
}
