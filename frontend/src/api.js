import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("fc_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export const errMsg = (e) =>
  (e?.response && !e.response.data?.message && [500, 502, 503, 504].includes(e.response.status)
    ? "Cannot reach the backend. Make sure it is running (npm run backend) and check its terminal for errors."
    : null) ||
  (e?.code === "ERR_NETWORK" ? "Cannot reach the server." : null) ||
  e?.response?.data?.message || e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Something went wrong";

export default api;
