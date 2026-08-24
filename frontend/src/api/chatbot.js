import api from "./axios";

export const predictSymptoms = (symptoms, age, gender) =>
  api
    .post("/chatbot/predict", { symptoms, age: age || null, gender: gender || null })
    .then((r) => ({ data: r.data, emergency: r.headers?.["x-emergency"] === "true" }));
