import api from "./axios";

export const getModelLog = () => api.get("/monitoring/model-log").then((r) => r.data);
export const getLatestStats = () => api.get("/monitoring/latest-stats").then((r) => r.data);
