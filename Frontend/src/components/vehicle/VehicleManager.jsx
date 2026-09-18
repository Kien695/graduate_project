import EntityManager from "../common/EntityManager";
import {
  fetchVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteVehicleImage,
} from "../../redux/slices/vehicleSlice";

const thunks = {
  fetch: fetchVehicles,
  create: createVehicle,
  update: updateVehicle,
  remove: deleteVehicle,
  removeImage: deleteVehicleImage,
};
const columns = [
  { key: "vin", label: "Số VIN", primary: true },
  { key: "images", label: "Hình ảnh", type: "image" },
  { key: "brand", label: "Hãng xe" },
  { key: "model", label: "Mẫu xe" },
  { key: "manufacture_year", label: "Năm SX" },
  { key: "price", label: "Giá bán", type: "money" },
  { key: "status", label: "Trạng thái", type: "status" },
];
const fields = [
  { key: "vin", label: "Số VIN", required: true },
  { key: "brand", label: "Hãng xe", required: true },
  { key: "model", label: "Mẫu xe", required: true },
  { key: "manufacture_year", label: "Năm sản xuất", type: "number" },
  { key: "color", label: "Màu sắc" },
  { key: "price", label: "Giá bán", type: "number", required: true },
  {
    key: "status",
    label: "Trạng thái",
    type: "select",
    default: "available",
    options: [
      { value: "available", label: "Có sẵn" },
      { value: "reserved", label: "Đã giữ chỗ" },
      { value: "sold", label: "Đã bán" },
      { value: "maintenance", label: "Bảo trì" },
      { value: "inactive", label: "Ngừng hoạt động" },
    ],
  },
  { key: "description", label: "Mô tả", type: "textarea", full: true },
];
const statusFilter = {
  key: "status",
  options: [
    { value: "available", label: "Có sẵn" },
    { value: "reserved", label: "Đã giữ chỗ" },
    { value: "sold", label: "Đã bán" },
    { value: "inspection", label: "Đang kiểm định" },
    { value: "maintenance", label: "Bảo trì" },
    { value: "inactive", label: "Ngừng hoạt động" },
  ],
};

export default function VehicleManager() {
  return (
    <EntityManager
      slice="vehicles"
      title="Danh sách xe trong kho"
      subtitle="Quản lý thông tin và trạng thái toàn bộ xe"
      addLabel="Thêm xe"
      thunks={thunks}
      columns={columns}
      fields={fields}
      statusFilter={statusFilter}
      imageUpload={{ label: "Hình ảnh xe", multiple: true, maxFiles: 10 }}
    />
  );
}
