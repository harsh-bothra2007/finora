import DashboardNavbar from "@/components/DashboardNavbar";
import SavingsPage from "@/components/savings/SavingsPage";
import { MOCK_USER } from "@/lib/mock-data";

export default function Page() {
  return (
    <main className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
      <DashboardNavbar userName={MOCK_USER.name} title="Savings Goals" hasData />
      <SavingsPage />
    </main>
  );
}
