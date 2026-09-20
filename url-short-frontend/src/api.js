import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "url_short_token";
const LEGACY_TOKEN_KEY = "token";
const USER_KEY = "url_short_user";
const PENDING_LINKS_KEY = "url_short_pending_links";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function saveSession(token, user) {
  saveToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getPendingGuestLinks() {
  const value = localStorage.getItem(PENDING_LINKS_KEY);
  if (!value) return [];

  try {
    const links = JSON.parse(value);
    return Array.isArray(links) ? links : [];
  } catch {
    localStorage.removeItem(PENDING_LINKS_KEY);
    return [];
  }
}

function addPendingGuestLink(shortCode) {
  const links = getPendingGuestLinks();
  localStorage.setItem(
    PENDING_LINKS_KEY,
    JSON.stringify([...new Set([shortCode, ...links])].slice(0, 50)),
  );
}

function clearPendingGuestLinks() {
  localStorage.removeItem(PENDING_LINKS_KEY);
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Something went wrong";
    const apiError = new Error(message);
    apiError.status = error.response?.status;
    return Promise.reject(apiError);
  },
);

const api = {
  register: (payload) =>
    client.post("/api/auth/register", payload).then((res) => res.data),
  login: (payload) =>
    client.post("/api/auth/login", payload).then((res) => res.data),
  getMe: () => client.get("/api/auth/me").then((res) => res.data),
  getStats: () => client.get("/api/url/stats").then((res) => res.data),
  getMyLinks: () => client.get("/api/url/my-links").then((res) => res.data),
  getLinkDetails: (shortCode) =>
    client.get(`/api/url/details/${shortCode}`).then((res) => res.data),
  createLink: (payload) =>
    client.post("/api/url/short", payload).then((res) => res.data),
  claimLinks: (shortCodes) =>
    client.put("/api/url/claim", { shortCodes }).then((res) => res.data),
  updateLink: (shortCode, payload) =>
    client.put(`/api/url/${shortCode}`, payload).then((res) => res.data),
  deleteLink: (id) =>
    client.put(`/api/url/delete/${id}`).then((res) => res.data),
};

function shortUrl(shortCode) {
  return `${BASE_URL}/api/url/${shortCode}`;
}

export {
  addPendingGuestLink,
  api,
  BASE_URL,
  clearPendingGuestLinks,
  clearToken,
  getPendingGuestLinks,
  getStoredUser,
  getToken,
  saveSession,
  saveToken,
  shortUrl,
};
