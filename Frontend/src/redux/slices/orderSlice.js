import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getData, postData, putData } from "../../utils/api";
const request = (type, path, method = "post") =>
  createAsyncThunk(`orders/${type}`, async (payload, { rejectWithValue }) => {
    try {
      const id = typeof payload === "object" ? payload.id : payload;
      const body = typeof payload === "object" ? payload.data : undefined;
      const response =
        method === "put"
          ? await putData(`/orders/${id}`, body)
          : await postData(`/orders/${id}/${path}`, body);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể cập nhật đơn hàng",
      );
    }
  });
export const fetchOrders = createAsyncThunk(
  "orders/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return (await getData("/orders")).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải đơn hàng",
      );
    }
  },
);
export const updateOrder = request("update", "", "put");
export const confirmOrder = request("confirm", "confirm");
export const cancelOrder = request("cancel", "cancel");
export const completeOrder = request("complete", "complete");
const actions = [updateOrder, confirmOrder, cancelOrder, completeOrder];
const slice = createSlice({
  name: "orders",
  initialState: { items: [], loading: false, submitting: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOrders.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchOrders.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload || [];
      })
      .addCase(fetchOrders.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });
    for (const thunk of actions)
      b.addCase(thunk.pending, (s) => {
        s.submitting = true;
        s.error = null;
      })
        .addCase(thunk.fulfilled, (s, a) => {
          s.submitting = false;
          const i = s.items.findIndex((x) => x.id === a.payload.id);
          if (i >= 0) s.items[i] = a.payload;
        })
        .addCase(thunk.rejected, (s, a) => {
          s.submitting = false;
          s.error = a.payload;
        });
  },
});
export default slice.reducer;
