import { createFileRoute } from '@tanstack/react-router';
import PayrollCalculator from '@components/salaries/PayrollCalculator';

export const Route = createFileRoute(
  '/_authenticated/admin/salaries/calculate'
)({
  component: PayrollCalculationPage
});

function PayrollCalculationPage() {
  return (
    <main className="min-w-0 space-y-5">
      <PayrollCalculator />
    </main>
  );
}
