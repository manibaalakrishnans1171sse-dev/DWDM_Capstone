import api from "./axios";

export const getAssociationRules = () => api.get("/mining/association-rules").then((r) => r.data);
export const getClusters = () => api.get("/mining/clusters").then((r) => r.data);
export const getDecisionTree = (page = 1, pageSize = 10) =>
  api.get("/mining/decision-tree", { params: { page, page_size: pageSize } }).then((r) => r.data);
