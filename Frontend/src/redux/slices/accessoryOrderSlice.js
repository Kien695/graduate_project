import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getData, postData } from "../../utils/api";
const request = (type, path) =>
  createAsyncThunk(
    `accessoryOrders/${type}`,
    async (id, { rejectWithValue }) => {
      try {
        const response = await postData(`/accessory-orders/${id}/${path}`);
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message || "Không thể cập nhật đơn hàng phụ kiện",
        );
      }
    },
  );
export const fetchAccessoryOrders = createAsyncThunk(
  "accessoryOrders/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return (await getData("/accessory-orders")).data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải đơn hàng phụ kiện",
      );
    }
  },
);
export const confirmAccessoryOrder = request("confirm", "confirm");
export const shipAccessoryOrder = request("ship", "ship");
export const cancelAccessoryOrder = request("cancel", "cancel");
export const completeAccessoryOrder = request("complete", "complete");
const actions = [
  confirmAccessoryOrder,
  shipAccessoryOrder,
  cancelAccessoryOrder,
  completeAccessoryOrder,
];
const slice = createSlice({
  name: "accessoryOrders",
  initialState: { items: [], loading: false, submitting: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAccessoryOrders.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchAccessoryOrders.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload || [];
      })
      .addCase(fetchAccessoryOrders.rejected, (s, a) => {
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
