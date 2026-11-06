const COLUMNS = [
  ["SELECT", "Xem"],
  ["INSERT", "Thêm"],
  ["UPDATE", "Sửa"],
  ["DELETE", "Xóa"],
];

export default function PermissionMatrix({ features, onToggle, readOnly = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="table-head">
          <tr>
            <th>Tính năng</th>
            {COLUMNS.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {features.map((feature) => (
            <tr key={feature.key}>
              <td className="font-bold">{feature.label}</td>
              {COLUMNS.map(([privilege]) => (
                <td key={privilege} className="text-center">
                  {feature.operations.includes(privilege) && (
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={Boolean(feature.permissions[privilege])}
                      onChange={() => onToggle?.(feature.key, privilege)}
                      title={feature.external?.[privilege] ? "Quyền còn đến từ nguồn khác" : ""}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
