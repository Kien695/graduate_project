import AccessoryManager from "../../components/accessory/AccessoryManager";
import PageHeader from "../../components/common/PageHeader";
export default function AccessoryPage() {
  return (
    <>
      <PageHeader
        title="Quản lý phụ kiện"
      />
      <AccessoryManager />
    </>
  );
}
