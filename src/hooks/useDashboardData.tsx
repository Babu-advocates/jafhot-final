import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns';

interface DashboardStats {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  todayOrders: number;
  weeklyOrders: number;
  monthlyOrders: number;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    todayOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        
        // Date ranges
        const todayStart = startOfDay(now).toISOString();
        const todayEnd = endOfDay(now).toISOString();
        
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Sunday
        
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();

        // Fetch today's data
        const { data: todayBills } = await supabase
          .from('bills')
          .select('total')
          .eq('status', 'completed')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd);

        // Fetch weekly data
        const { data: weeklyBills } = await supabase
          .from('bills')
          .select('total')
          .eq('status', 'completed')
          .gte('created_at', weekStart)
          .lte('created_at', weekEnd);

        // Fetch monthly data
        const { data: monthlyBills } = await supabase
          .from('bills')
          .select('total')
          .eq('status', 'completed')
          .gte('created_at', monthStart)
          .lte('created_at', monthEnd);

        // Calculate totals
        const todaySales = todayBills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0;
        const weeklySales = weeklyBills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0;
        const monthlySales = monthlyBills?.reduce((sum, bill) => sum + Number(bill.total), 0) || 0;

        // Calculate order counts
        const todayOrders = todayBills?.length || 0;
        const weeklyOrders = weeklyBills?.length || 0;
        const monthlyOrders = monthlyBills?.length || 0;

        setStats({
          todaySales,
          weeklySales,
          monthlySales,
          todayOrders,
          weeklyOrders,
          monthlyOrders,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { stats, loading };
};