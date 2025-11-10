
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, DollarSign, ShoppingCart, Users, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { UserRole } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DashboardContentProps {
  userRole: UserRole;
}

export const DashboardContent = ({ userRole }: DashboardContentProps) => {
  if (userRole === 'biller') {
    return <BillerDashboard />;
  }
  
  return <KitchenDashboard />;
};

const BillerDashboard = () => {
  const { stats: dashboardStats, loading } = useDashboardData();
  
  const stats = [
    {
      title: "Today's Sales",
      value: loading ? "Loading..." : `₹${dashboardStats.todaySales.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Weekly Sales",
      value: loading ? "Loading..." : `₹${dashboardStats.weeklySales.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Monthly Sales",
      value: loading ? "Loading..." : `₹${dashboardStats.monthlySales.toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Today's Orders",
      value: loading ? "Loading..." : dashboardStats.todayOrders.toString(),
      icon: ShoppingCart,
      color: "text-restaurant-blue"
    },
    {
      title: "Weekly Orders",
      value: loading ? "Loading..." : dashboardStats.weeklyOrders.toString(),
      icon: ShoppingCart,
      color: "text-restaurant-blue"
    },
    {
      title: "Monthly Orders",
      value: loading ? "Loading..." : dashboardStats.monthlyOrders.toString(),
      icon: ShoppingCart,
      color: "text-restaurant-blue"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((order) => (
                <div key={order} className="flex items-center justify-between p-3 bg-restaurant-gray-light rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Order #{1000 + order}</p>
                    <p className="text-sm text-gray-600">Table {order + 4}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₹{((25.50 + order * 5) * 83).toFixed(0)}</p>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-restaurant-blue text-white rounded-lg hover:bg-restaurant-blue-hover transition-colors">
                <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">New Order</span>
              </button>
              <button className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <Users className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Add Customer</span>
              </button>
              <button className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                <BarChart3 className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Reports</span>
              </button>
              <button className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <DollarSign className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">Payments</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const KitchenDashboard = () => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();
    
    // Set up real-time subscription for active orders
    const channel = supabase
      .channel('active-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => fetchActiveOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          bill_items (
            id,
            food_item_id,
            food_item_name,
            price,
            quantity,
            total
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActiveOrders(data || []);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markOrderComplete = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Order completed",
        description: "Order has been marked as completed"
      });
    } catch (error) {
      console.error('Error completing order:', error);
      toast({
        title: "Error",
        description: "Failed to complete order",
        variant: "destructive"
      });
    }
  };

  const getTimeSinceOrder = (createdAt: string) => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    return `${diffInMinutes}m`;
  };

  const getOrderPriority = (createdAt: string) => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes > 15) return { priority: 'high', color: 'bg-red-100 text-red-600' };
    if (diffInMinutes > 10) return { priority: 'medium', color: 'bg-yellow-100 text-yellow-600' };
    return { priority: 'low', color: 'bg-green-100 text-green-600' };
  };

  const kitchenStats = [
    {
      title: "Active Orders",
      value: loading ? "..." : activeOrders.length.toString(),
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "Completed Today",
      value: "87",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Pending Orders",
      value: loading ? "..." : activeOrders.filter(order => getOrderPriority(order.created_at).priority === 'high').length.toString(),
      icon: AlertCircle,
      color: "text-red-600"
    },
    {
      title: "Avg. Prep Time",
      value: "12m",
      icon: Clock,
      color: "text-restaurant-blue"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kitchenStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-gray-500">Loading orders...</p>
              ) : activeOrders.length === 0 ? (
                <p className="text-center text-gray-500">No active orders</p>
              ) : (
                activeOrders.map((order) => {
                  const { priority, color } = getOrderPriority(order.created_at);
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-restaurant-gray-light rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Order #{order.mobile_last_digit}
                          {order.customer_name && ` - ${order.customer_name}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.bill_items?.map((item: any) => `${item.quantity}x ${item.food_item_name}`).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total: ₹{order.total} • {order.bill_items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="font-medium text-gray-900">{getTimeSinceOrder(order.created_at)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${color}`}>
                          {priority}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => markOrderComplete(order.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Kitchen Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Orders in Queue</span>
                <span className="font-bold text-restaurant-blue">{activeOrders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Average Wait Time</span>
                <span className="font-bold text-orange-600">12 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Kitchen Efficiency</span>
                <span className="font-bold text-green-600">94%</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                {activeOrders.length > 0 ? (
                  <Button 
                    onClick={() => markOrderComplete(activeOrders[0].id)}
                    className="w-full p-3 bg-restaurant-blue text-white rounded-lg hover:bg-restaurant-blue-hover transition-colors"
                  >
                    Mark Next Order Complete
                  </Button>
                ) : (
                  <p className="text-center text-gray-500 py-3">No orders to complete</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
