import OrderManager from "../../components/order/OrderManager";
import PageHeader from "../../components/common/PageHeader";
export default function OrderPage() {
  return (
    <>
      <PageHeader
        title="Quản lý đơn hàng"
        description="Xác nhận, hủy và hoàn tất đơn đặt xe"
      />
      <OrderManager />
    </>
  );
}
