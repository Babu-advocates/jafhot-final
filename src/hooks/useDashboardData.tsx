import { useState, useEffect } from 'react';
import { fetchDashboardStats, type DashboardStats } from '@/lib/api';

const defaultStats: DashboardStats = {
  todaySales: 0,
  weeklySales: 0,
  monthlySales: 0,
  todayOrders: 0,
  weeklyOrders: 0,
  monthlyOrders: 0,
};

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { stats, loading };
};