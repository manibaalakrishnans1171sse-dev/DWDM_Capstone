import api from "./axios";

export const getTableList = () => api.get("/tables/list").then((r) => r.data);

export const getTableData = (tableName, { page = 1, pageSize = 10, search = "", sortCol = "", sortDir = "asc" } = {}) =>
  api
    .get(`/tables/${tableName}`, {
      params: { page, page_size: pageSize, search, sort_col: sortCol, sort_dir: sortDir },
    })
    .then((r) => r.data);
