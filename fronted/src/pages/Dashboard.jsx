import DashboardCards from "../components/DashboardCards";
import RecentPayments from "../components/RecentPayments";
import MonthlyCollection from "../components/MonthlyCollection";

function Dashboard() {
  return (
    <div>
      <DashboardCards />

      <RecentPayments />

      <MonthlyCollection />
    </div>
  );
}

export default Dashboard;