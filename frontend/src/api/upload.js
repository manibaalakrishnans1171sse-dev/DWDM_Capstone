import api from "./axios";

export const getUploadHistory = () => api.get("/upload/history").then((r) => r.data);

export const uploadDataset = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/upload/dataset", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};
