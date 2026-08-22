import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteData, getData, postData, putData } from "../../utils/api";

export const createEntitySlice = ({ name, endpoint }) => {
  const fetchAll = createAsyncThunk(`${name}/fetchAll`, async (params, { rejectWithValue }) => {
    try { return (await getData(endpoint, { params })).data; } catch (error) { return rejectWithValue(error.response?.data?.message || "Không thể tải dữ liệu"); }
  });
  const createOne = createAsyncThunk(`${name}/createOne`, async (payload, { rejectWithValue }) => {
    try { return (await postData(endpoint, payload)).data; } catch (error) { return rejectWithValue(error.response?.data?.message || "Không thể tạo dữ liệu"); }
  });
  const updateOne = createAsyncThunk(`${name}/updateOne`, async ({ id, data }, { rejectWithValue }) => {
    try { return (await putData(`${endpoint}/${id}`, data)).data; } catch (error) { return rejectWithValue(error.response?.data?.message || "Không thể cập nhật dữ liệu"); }
  });
  const deleteOne = createAsyncThunk(`${name}/deleteOne`, async (id, { rejectWithValue }) => {
    try { await deleteData(`${endpoint}/${id}`); return id; } catch (error) { return rejectWithValue(error.response?.data?.message || "Không thể xóa dữ liệu"); }
  });
  const slice = createSlice({
    name,
    initialState: { items: [], loading: false, submitting: false, error: null },
    reducers: { clearError: (state) => { state.error = null; } },
    extraReducers: (builder) => builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAll.fulfilled, (state, action) => { state.loading = false; state.items = Array.isArray(action.payload) ? action.payload : action.payload?.items || []; })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createOne.fulfilled, (state, action) => { state.submitting = false; state.items.unshift(action.payload); })
      .addCase(updateOne.fulfilled, (state, action) => { state.submitting = false; const index=state.items.findIndex((item)=>item.id===action.payload.id); if(index>=0) state.items[index]=action.payload; })
      .addCase(deleteOne.fulfilled, (state, action) => { state.submitting = false; state.items=state.items.filter((item)=>item.id!==action.payload); })
      .addMatcher((action) => [createOne.pending.type,updateOne.pending.type,deleteOne.pending.type].includes(action.type), (state) => { state.submitting = true; state.error = null; })
      .addMatcher((action) => [createOne.rejected.type,updateOne.rejected.type,deleteOne.rejected.type].includes(action.type), (state, action) => { state.submitting = false; state.error = action.payload; }),
  });
  return { reducer: slice.reducer, actions: slice.actions, thunks: { fetchAll, createOne, updateOne, deleteOne } };
};
