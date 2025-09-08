import TradingDashboard from './TradingDashboard';
import AuthGuard from '@/components/AuthGuard';

export default function Dashboard() {
  return (
    <AuthGuard>
      <TradingDashboard />
    </AuthGuard>
  );
}