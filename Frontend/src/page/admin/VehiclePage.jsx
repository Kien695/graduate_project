import VehicleManager from "../../components/vehicle/VehicleManager";
import PageHeader from "../../components/common/PageHeader";
export default function VehiclePage() {
  return (
    <>
      <PageHeader
        title="Quản lý xe"
        description="Danh mục và trạng thái xe trong kho"
      />
      <VehicleManager />
    </>
  );
}
