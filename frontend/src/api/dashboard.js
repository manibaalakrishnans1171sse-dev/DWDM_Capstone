import api from "./axios";

export const getKpis = () => api.get("/dashboard/kpis").then((r) => r.data);
export const getRevenueByDept = () => api.get("/dashboard/revenue-by-dept").then((r) => r.data);
export const getMonthlyTrend = () => api.get("/dashboard/monthly-trend").then((r) => r.data);
export const getVisitTypes = () => api.get("/dashboard/visit-types").then((r) => r.data);
export const getPaymentModes = () => api.get("/dashboard/payment-modes").then((r) => r.data);
export const getAgeGroups = () => api.get("/dashboard/age-groups").then((r) => r.data);
export const getSummaryStats = () => api.get("/dashboard/summary-stats").then((r) => r.data);
