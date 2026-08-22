import { createEntitySlice } from "./entitySliceFactory";
const entity=createEntitySlice({name:"accessories",endpoint:"/accessories"});
export const {fetchAll:fetchAccessories,createOne:createAccessory,updateOne:updateAccessory,deleteOne:deleteAccessory}=entity.thunks;
export default entity.reducer;
