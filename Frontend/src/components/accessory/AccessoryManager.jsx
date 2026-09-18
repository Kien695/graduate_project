import EntityManager from "../common/EntityManager";
import {
  createAccessory,
  deleteAccessory,
  deleteAccessoryImage,
  fetchAccessories,
  updateAccessory,
} from "../../redux/slices/accessorySlice";

const columns = [
  { key: "sku", label: "Mã SKU", primary: true },
  { key: "images", label: "Hình ảnh", type: "image" },
  { key: "name", label: "Tên phụ kiện", primary: true },
  { key: "price", label: "Giá bán", type: "money" },
  { key: "stock", label: "Tồn kho" },
  {
    key: "display_status",
    label: "Trạng thái",
    type: "status",
    value: (item) =>
      item.is_active === false
        ? "INACTIVE"
        : Number(item.stock) <= 0
          ? "OUT_OF_STOCK"
          : "ACTIVE",
  },
];
const fields = [
  { key: "sku", label: "Mã SKU", required: true },
  { key: "name", label: "Tên phụ kiện", required: true },
  { key: "price", label: "Giá bán", type: "number", required: true },
  {
    key: "stock",
    label: "Số lượng tồn kho",
    type: "number",
    required: true,
    default: 0,
  },
  {
    key: "is_active",
    label: "Trạng thái",
    type: "select",
    default: true,
    options: [
      { value: true, label: "Đang kinh doanh" },
      { value: false, label: "Ngừng kinh doanh" },
    ],
  },
];
const thunks = {
  fetch: fetchAccessories,
  create: createAccessory,
  update: updateAccessory,
  remove: deleteAccessory,
  removeImage: deleteAccessoryImage,
};
const statusFilter = {
  value: (item) =>
    item.is_active === false
      ? "inactive"
      : Number(item.stock) <= 0
        ? "out_of_stock"
        : "active",
  options: [
    { value: "active", label: "Đang kinh doanh" },
    { value: "out_of_stock", label: "Hết hàng" },
    { value: "inactive", label: "Ngừng kinh doanh" },
  ],
};

export default function AccessoryManager() {
  return (
    <EntityManager
      slice="accessories"
      title="Phụ kiện"
      subtitle="Thêm, cập nhật giá bán và quản lý tồn kho"
      columns={columns}
      fields={fields}
      thunks={thunks}
      statusFilter={statusFilter}
      addLabel="Thêm phụ kiện"
      imageUpload={{ label: "Hình ảnh phụ kiện", multiple: true, maxFiles: 10 }}
    />
  );
}
