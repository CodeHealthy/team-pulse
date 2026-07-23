import { clientConfig } from "../../config/client-config";

const apiBaseUrl = clientConfig.apiUrl.replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  constructor({ message, code, status, details }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function apiRequest(
  path,
  options = {},
  { retryAfterRefresh = true } = {},
) {
  const response = await fetch(
    `${apiBaseUrl}${path}`,
    {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body &&
        !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    },
  );

  if (
    response.status === 401 &&
    retryAfterRefresh &&
    path !== "/auth/refresh"
  ) {
    const refreshResponse = await fetch(
      `${apiBaseUrl}/auth/refresh`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (refreshResponse.ok) {
      return apiRequest(path, options, {
        retryAfterRefresh: false,
      });
    }
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError({
      message:
        payload?.error?.message ??
        "The request could not be completed",
      code:
        payload?.error?.code ?? "REQUEST_FAILED",
      status: response.status,
      details: payload?.error?.details,
    });
  }

  return payload;
}

function sendCredentials(path, credentials) {
  return apiRequest(
    path,
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
    {
      retryAfterRefresh: false,
    },
  );
}

export const authApi = Object.freeze({
  async register(credentials) {
    const response = await sendCredentials(
      "/auth/register",
      credentials,
    );

    return response.data.user;
  },

  async login(credentials) {
    const response = await sendCredentials(
      "/auth/login",
      credentials,
    );

    return response.data.user;
  },

  async getCurrentUser() {
    const response = await apiRequest("/auth/me");
    return response.data.user;
  },

  async updateProfile(profile) {
    const response = await apiRequest(
      "/settings/profile",
      {
        method: "PATCH",
        body: JSON.stringify(profile),
      },
    );

    return response.data.user;
  },

  async updatePersonalSettings(settings) {
    const response = await apiRequest(
      "/settings/personal",
      {
        method: "PATCH",
        body: JSON.stringify(settings),
      },
    );

    return response.data.user;
  },

  async updatePrivacySettings(settings) {
    const response = await apiRequest(
      "/settings/privacy",
      {
        method: "PATCH",
        body: JSON.stringify(settings),
      },
    );

    return response.data.user;
  },

  async logout() {
    await apiRequest(
      "/auth/logout",
      { method: "POST" },
      { retryAfterRefresh: false },
    );
  },
});
