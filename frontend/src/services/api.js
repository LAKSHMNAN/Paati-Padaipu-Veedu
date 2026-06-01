import axios from "axios";

const SESSION_KEY_STORAGE = "ppv_session_key";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
});

// Attach stored session key as header on every request
api.interceptors.request.use((config) => {
  const sessionKey = localStorage.getItem(SESSION_KEY_STORAGE);
  if (sessionKey) {
    config.headers["X-Session-Key"] = sessionKey;
  }
  return config;
});

export const registerUser = async (payload) => {
  const { data } = await api.post("/auth/register/", payload);
  return data.user;
};

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login/", payload);
  if (data.session_key) {
    localStorage.setItem(SESSION_KEY_STORAGE, data.session_key);
  }
  return data.user;
};

export const logoutUser = async () => {
  await api.post("/auth/logout/");
  localStorage.removeItem(SESSION_KEY_STORAGE);
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get("/auth/me/");
  return data.user;
};

export const fetchCollection = async (endpoint, search = "", options = {}) => {
  const params = {};
  if (search) {
    params.search = search;
  }
  if (Number.isFinite(options.limit)) {
    params.limit = options.limit;
  }
  if (Number.isFinite(options.offset)) {
    params.offset = options.offset;
  }

  const { data } = await api.get(`/${endpoint}/`, {
    params,
  });
  if (options.returnPage) {
    const results = data.results || data;
    return {
      results,
      count: data.count ?? results.length,
      next: data.next || null,
      previous: data.previous || null,
    };
  }
  return data.results || data;
};

export const fetchItem = async (endpoint, id) => {
  const { data } = await api.get(`/${endpoint}/${id}/`);
  return data;
};

export const createItem = async (endpoint, payload) => {
  const { data } = await api.post(`/${endpoint}/`, payload);
  return data;
};

export const updateItem = async (endpoint, id, payload) => {
  const { data } = await api.put(`/${endpoint}/${id}/`, payload);
  return data;
};

export const deleteItem = async (endpoint, id) => {
  await api.delete(`/${endpoint}/${id}/`);
};

export const fetchDashboard = async () => {
  const { data } = await api.get("/dashboard/");
  return data;
};

export const fetchAuctionTransactionReport = async (status = "", search = "", options = {}) => {
  const statusPath = status ? `${status}/` : "";
  const params = {};
  if (search) {
    params.search = search;
  }
  if (Number.isFinite(options.limit)) {
    params.limit = options.limit;
  }
  if (Number.isFinite(options.offset)) {
    params.offset = options.offset;
  }
  const { data } = await api.get(`/reports/auction-transactions/${statusPath}`, {
    params,
  });
  return data;
};

export const getAuctionTransactionReportUrl = (status = "", format = "csv", search = "") => {
  const statusPath = status ? `${status}/` : "";
  const params = new URLSearchParams({ format });
  if (search) {
    params.set("search", search);
  }
  return `${api.defaults.baseURL}/reports/auction-transactions/${statusPath}?${params.toString()}`;
};

export const fetchAuctionTransactionByItemReport = async () => {
  const { data } = await api.get("/reports/auction-transactions/by-item/");
  return data;
};

export const fetchAuctionTransactionsByItem = async (itemId, options = {}) => {
  const params = {};
  if (Number.isFinite(options.limit)) params.limit = options.limit;
  if (Number.isFinite(options.offset)) params.offset = options.offset;
  const { data } = await api.get(`/reports/auction-transactions/by-item/${itemId}/`, { params });
  return data;
};

export const getAuctionTransactionByItemReportUrl = (format = "csv") => {
  const params = new URLSearchParams({ format });
  return `${api.defaults.baseURL}/reports/auction-transactions/by-item/?${params.toString()}`;
};

export const translateAuctionItemName = async (auctionItemName) => {
  const { data } = await api.post("/auction-items/translate/", {
    auction_item_name: auctionItemName,
  });
  return data;
};
