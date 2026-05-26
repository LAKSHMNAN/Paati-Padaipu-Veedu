import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
  withCredentials: true,
});

export const registerUser = async (payload) => {
  const { data } = await api.post("/auth/register/", payload);
  return data.user;
};

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login/", payload);
  return data.user;
};

export const logoutUser = async () => {
  await api.post("/auth/logout/");
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

export const getDonationReportUrl = (format = "pdf", search = "") => {
  const params = new URLSearchParams({ format });
  if (search) {
    params.set("search", search);
  }
  return `${api.defaults.baseURL}/reports/donations/?${params.toString()}`;
};

export const translateAuctionItemName = async (auctionItemName) => {
  const { data } = await api.post("/auction-items/translate/", {
    auction_item_name: auctionItemName,
  });
  return data;
};
