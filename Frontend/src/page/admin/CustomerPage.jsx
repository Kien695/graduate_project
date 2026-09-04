import CustomerManager from "../../components/customer/CustomerManager";
import PageHeader from "../../components/common/PageHeader";
export default function CustomerPage() {
  return (
    <>
      <PageHeader
        title="Quản lý khách hàng"
        description="Thông tin khách hàng và hồ sơ giao dịch"
      />
      <CustomerManager />
    </>
  );
}
