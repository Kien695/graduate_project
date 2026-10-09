import OrderManager from "../../components/order/OrderManager";
import PageHeader from "../../components/common/PageHeader";
export default function OrderPage() {
  return (
    <>
      <PageHeader
        title="Quản lý đơn hàng"
      />
      <OrderManager />
    </>
  );
}
