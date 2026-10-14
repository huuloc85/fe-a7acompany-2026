import { createFileRoute, Link } from '@tanstack/react-router';
import PayrollCalculator from '@components/salaries/PayrollCalculator';
import ComponentCard from '@components/common/ComponentCard';

export const Route = createFileRoute(
  '/_authenticated/admin/salaries/calculate'
)({
  component: PayrollCalculationPage
});

function PayrollCalculationPage() {
  return (
    <main className="min-w-0 space-y-5">
      <ComponentCard
        title={
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>Tính lương</span>
            <Link
              to="/admin/salaries"
              className="header-action-btn header-action-btn--neutral normal-case"
            >
              Về quản lý bảng lương
            </Link>
          </span>
        }
        desc="Bản tạm tính từ dữ liệu chấm công trên web. Các khoản chưa lưu sẽ mất khi rời trang."
      >
        <PayrollCalculator />
      </ComponentCard>
    </main>
  );
}
