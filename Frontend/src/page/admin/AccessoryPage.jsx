import AccessoryManager from "../../components/accessory/AccessoryManager";
import PageHeader from "../../components/common/PageHeader";
export default function AccessoryPage() {
  return (
    <>
      <PageHeader
        title="Quản lý phụ kiện"
        description="Danh mục phụ kiện và số lượng tồn kho"
      />
      <AccessoryManager />
    </>
  );
}
