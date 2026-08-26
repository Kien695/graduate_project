import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getData, postData, putData } from "../../utils/api";

const rejectMessage = (error, fallback, rejectWithValue) =>
  rejectWithValue(error.response?.data?.message || fallback);

export const fetchInspections = createAsyncThunk("inspections/fetch", async (_, { rejectWithValue }) => {
  try { return (await getData("/inspections")).data; }
  catch (error) { return rejectMessage(error, "Không thể tải kiểm định", rejectWithValue); }
});
export const createInspection = createAsyncThunk("inspections/create", async (data, { rejectWithValue }) => {
  try { return (await postData("/inspections", data)).data; }
  catch (error) { return rejectMessage(error, "Không thể tạo kiểm định", rejectWithValue); }
});
export const updateInspection = createAsyncThunk("inspections/update", async ({ id, data }, { rejectWithValue }) => {
  try { return (await putData(`/inspections/${id}`, data)).data; }
  catch (error) { return rejectMessage(error, "Không thể cập nhật kiểm định", rejectWithValue); }
});

const action = (name, method, path) => createAsyncThunk(`inspections/${name}`, async ({ id, data }, { rejectWithValue }) => {
  try {
    const request = method === "put" ? putData : postData;
    return (await request(`/inspections/${id}/${path}`, data)).data;
  } catch (error) { return rejectMessage(error, "Không thể cập nhật kiểm định", rejectWithValue); }
});

export const startInspection = action("start", "post", "start");
export const updateInspectionChecklist = action("checklist", "put", "checklist");
export const passInspection = action("pass", "post", "pass");
export const failInspection = action("fail", "post", "fail");
export const uploadInspectionImages = action("images", "post", "images");

const mutations = [createInspection, updateInspection, startInspection, updateInspectionChecklist, passInspection, failInspection, uploadInspectionImages];
const slice = createSlice({
  name: "inspections",
  initialState: { items: [], loading: false, submitting: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInspections.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInspections.fulfilled, (state, actionValue) => { state.loading = false; state.items = actionValue.payload || []; })
      .addCase(fetchInspections.rejected, (state, actionValue) => { state.loading = false; state.error = actionValue.payload; });
    for (const thunk of mutations) {
      builder
        .addCase(thunk.pending, (state) => { state.submitting = true; state.error = null; })
        .addCase(thunk.fulfilled, (state, actionValue) => {
          state.submitting = false;
          if (!actionValue.payload?.id) return;
          const index = state.items.findIndex((item) => item.id === actionValue.payload.id);
          if (index >= 0) state.items[index] = { ...state.items[index], ...actionValue.payload };
          else state.items.unshift(actionValue.payload);
        })
        .addCase(thunk.rejected, (state, actionValue) => { state.submitting = false; state.error = actionValue.payload; });
    }
  },
});
export default slice.reducer;
