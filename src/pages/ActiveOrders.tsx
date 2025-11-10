import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, Check, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";
import SearchFilter from "@/components/SearchFilter";

interface OrderItem {
  id: string;
  food_item_id: string;
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

interface ActiveOrder {
  id: string;
  customer_name: string | null;
  mobile_last_digit: string;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  bill_items: OrderItem[];
  previous_items?: OrderItem[]; // Store previous items to track differences
}

const ActiveOrders = () => {
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    fetchActiveOrders();
    
    // Set up real-time subscription for active orders
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => fetchActiveOrders()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_items'
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
      toast.error("Failed to fetch active orders", {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      // Get order details before deletion for notification
      const { data: orderData } = await supabase
        .from('bills')
        .select('customer_name, mobile_last_digit')
        .eq('id', orderId)
        .single();

      // Delete bill items first (due to foreign key constraint)
      await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', orderId);

      // Then delete the bill
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order #${orderData?.mobile_last_digit} cancelled and biller will be notified`, {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error("Failed to cancel order", {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      // Get the order data to check if it's additional items
      const { data: orderData } = await supabase
        .from('bills')
        .select(`
          *,
          bill_items(*)
        `)
        .eq('id', orderId)
        .single();

      if (!orderData) throw new Error('Order not found');

      // Check if this order number already exists in drafts
      const { data: existingDraft } = await supabase
        .from('bills')
        .select('id')
        .eq('status', 'draft')
        .eq('mobile_last_digit', orderData.mobile_last_digit)
        .single();

      if (existingDraft && !orderData.mobile_last_digit?.includes('Additional')) {
        // Order already exists in drafts, don't add duplicate
        toast.error("Order already exists in drafts. Cannot add duplicate.", {
          style: {
            background: 'white',
            color: '#333',
            border: '1px solid #e5e5e5',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
        return;
      }

      if (orderData.mobile_last_digit?.includes('Additional')) {
        // Merge additional items into the existing draft (same base number)
        const baseNumber = orderData.mobile_last_digit.replace(/\s*\(Additional\)\s*$/, '').trim();

        // Find existing draft for base number
        const { data: baseDraft } = await supabase
          .from('bills')
          .select('id, total')
          .eq('status', 'draft')
          .eq('mobile_last_digit', baseNumber)
          .single();

        if (baseDraft) {
          // Fetch existing items in the base draft
          const { data: baseItems } = await supabase
            .from('bill_items')
            .select('id, food_item_id, food_item_name, price, quantity, total')
            .eq('bill_id', baseDraft.id);

          const additionalItems = orderData.bill_items || [];

          // Aggregate items by food_item_id and price to prevent duplicates
          type Item = { food_item_id: string; food_item_name: string; price: number; quantity: number; total: number };
          const aggregate = new Map<string, Item>();

          const pushItem = (it: Item) => {
            const key = `${it.food_item_id}-${it.price}`;
            const existing = aggregate.get(key);
            if (existing) {
              existing.quantity += it.quantity;
              existing.total = existing.price * existing.quantity;
            } else {
              aggregate.set(key, { ...it });
            }
          };

          (baseItems || []).forEach((it) =>
            pushItem({
              food_item_id: it.food_item_id,
              food_item_name: it.food_item_name,
              price: it.price,
              quantity: it.quantity,
              total: it.total,
            })
          );

          additionalItems.forEach((it) =>
            pushItem({
              food_item_id: it.food_item_id,
              food_item_name: it.food_item_name,
              price: it.price,
              quantity: it.quantity,
              total: it.total,
            })
          );

          const mergedItems = Array.from(aggregate.values());

          // Replace existing draft items with merged items
          await supabase.from('bill_items').delete().eq('bill_id', baseDraft.id);
          if (mergedItems.length > 0) {
            await supabase.from('bill_items').insert(
              mergedItems.map((i) => ({
                bill_id: baseDraft.id,
                food_item_id: i.food_item_id,
                food_item_name: i.food_item_name,
                price: i.price,
                quantity: i.quantity,
                total: i.total,
              }))
            );
          }

          // Update base draft total
          const newTotal = mergedItems.reduce((sum, i) => sum + i.total, 0);
          await supabase.from('bills').update({ total: newTotal }).eq('id', baseDraft.id);

          // Remove the temporary additional bill and its items
          await supabase.from('bill_items').delete().eq('bill_id', orderId);
          await supabase.from('bills').delete().eq('id', orderId);

          toast.success('Additional items merged into existing draft bill!', {
            style: {
              background: 'white',
              color: '#333',
              border: '1px solid #e5e5e5',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
            },
          });
        } else {
          // No existing base draft: convert this bill to draft under base number
          await supabase
            .from('bills')
            .update({ status: 'draft', mobile_last_digit: baseNumber })
            .eq('id', orderId);

          toast.success('Order completed and added to draft under original bill number.', {
            style: {
              background: 'white',
              color: '#333',
              border: '1px solid #e5e5e5',
              padding: '16px',
              fontSize: '14px',
              fontWeight: '500',
            },
          });
        }
      } else {
        // Regular order completion - convert to draft for biller
        await supabase
          .from('bills')
          .update({ status: 'draft' })
          .eq('id', orderId);

        toast.success('Order completed and sent to biller as draft!', {
          style: {
            background: 'white',
            color: '#333',
            border: '1px solid #e5e5e5',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
        });
      }
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error("Failed to complete order", {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  const sendBackToDraft = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'draft' })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Order sent back to biller for modifications", {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    } catch (error) {
      console.error('Error sending order back to draft:', error);
      toast.error("Failed to send order back to draft", {
        style: {
          background: 'white',
          color: '#333',
          border: '1px solid #e5e5e5',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
      });
    }
  };

  const getTimeSinceOrder = (createdAt: string) => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const hours = Math.floor(diffInMinutes / 60);
    const mins = diffInMinutes % 60;
    return `${hours}h ${mins}m ago`;
  };

  const getOrderPriority = (createdAt: string) => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes > 20) return { priority: 'urgent', color: 'bg-red-500', textColor: 'text-white' };
    if (diffInMinutes > 15) return { priority: 'high', color: 'bg-orange-500', textColor: 'text-white' };
    if (diffInMinutes > 10) return { priority: 'medium', color: 'bg-yellow-500', textColor: 'text-black' };
    return { priority: 'normal', color: 'bg-green-500', textColor: 'text-white' };
  };

  // Filter orders based on search and priority
  const filteredOrders = activeOrders.filter((order) => {
    const matchesSearch = !searchQuery || 
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.mobile_last_digit.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || 
      getOrderPriority(order.created_at).priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16 md:pb-0">
        <div className="text-xl font-semibold text-muted-foreground">Loading active orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-16 md:pb-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Active Orders</h1>
          <p className="text-sm sm:text-lg text-muted-foreground mt-1">
            Kitchen Dashboard - {filteredOrders.length} of {activeOrders.length} orders
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm sm:text-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-restaurant-accent-orange" />
            <span className="font-semibold">{activeOrders.length} Active</span>
          </div>
        </div>
      </div>

      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
      />

      {activeOrders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-muted-foreground mb-2">No Active Orders</h3>
            <p className="text-lg text-muted-foreground">All caught up! New orders will appear here automatically.</p>
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-muted-foreground mb-2">No Orders Found</h3>
            <p className="text-lg text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredOrders.map((order) => {
            const { priority, color, textColor } = getOrderPriority(order.created_at);
            
            return (
              <Card key={order.id} className="relative border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-2xl font-bold text-foreground mb-2 truncate">
                        Order #{order.mobile_last_digit}
                      </CardTitle>
                      {order.customer_name && (
                        <p className="text-base sm:text-xl text-muted-foreground font-medium truncate">{order.customer_name}</p>
                      )}
                      {order.mobile_last_digit.includes("Additional") && (
                        <div className="mt-2 mb-2">
                          <span className="px-2 py-1 bg-restaurant-blue/10 text-restaurant-blue text-xs font-semibold rounded-full">
                            ADDITIONAL ITEMS
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color} ${textColor}`}>
                          {priority.toUpperCase()}
                        </span>
                        <span className="text-sm sm:text-lg text-muted-foreground font-medium">
                          {getTimeSinceOrder(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm font-medium border border-restaurant-blue text-restaurant-blue hover:bg-restaurant-blue hover:text-white transition-colors"
                        onClick={() => sendBackToDraft(order.id)}
                      >
                        Modify
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {/* Food Items - Responsive size */}
                    <div className="space-y-2 sm:space-y-3">
                      {order.bill_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                              {item.food_item_name}
                            </h4>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-2xl sm:text-4xl font-extrabold text-restaurant-accent-orange">
                              {item.quantity}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons at bottom - Cancel left, Complete right */}
                    <div className="flex gap-2 pt-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCancelConfirm(order.id)}
                        className="flex-1 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        onClick={() => completeOrder(order.id)}
                      >
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to cancel this order? This action cannot be undone and will notify the biller.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-red-500 text-white hover:bg-red-600 border-red-500"
              onClick={() => setCancelConfirm(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-transparent text-red-500 border-2 border-red-500 hover:bg-red-50"
              onClick={() => {
                if (cancelConfirm) {
                  cancelOrder(cancelConfirm);
                  setCancelConfirm(null);
                }
              }}
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveOrders;