import { createEntitySlice } from "./entitySliceFactory";
const entity = createEntitySlice({ name: "customers", endpoint: "/customers" });
export const {
  fetchAll: fetchCustomers,
  createOne: createCustomer,
  updateOne: updateCustomer,
  deleteOne: deleteCustomer,
} = entity.thunks;
export default entity.reducer;
