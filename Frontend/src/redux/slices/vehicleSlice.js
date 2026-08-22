import { createEntitySlice } from "./entitySliceFactory";
const entity=createEntitySlice({name:"vehicles",endpoint:"/vehicles"});
export const {fetchAll:fetchVehicles,createOne:createVehicle,updateOne:updateVehicle,deleteOne:deleteVehicle}=entity.thunks;
export default entity.reducer;
