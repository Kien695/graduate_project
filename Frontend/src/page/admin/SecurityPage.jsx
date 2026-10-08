import SecurityManager from "../../components/security/SecurityManager";
import PageHeader from "../../components/common/PageHeader";
export default function SecurityPage() {
  return (
    <>
      <PageHeader
        title="Bảo mật hệ thống"
      />
      <SecurityManager />
    </>
  );
}
