import ContractManager from "../../components/contract/ContractManager";
import PageHeader from "../../components/common/PageHeader";
export default function ContractPage() {
  return (
    <>
      <PageHeader
        title="Quản lý hợp đồng"
        description="Duyệt, ký và theo dõi thanh toán"
      />
      <ContractManager />
    </>
  );
}
