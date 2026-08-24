import api from "./axios";

export const getStarSchemaInfo = () => api.get("/schema/star-schema-info").then((r) => r.data);
