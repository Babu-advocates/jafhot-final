import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Calendar, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { printBill as printBillUtil } from "@/utils/billPrint";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Bill {
  id: string;
  customer_name: string | null;
  mobile_last_digit: string;
  total: number;
  status: string;
  payment_mode?: string | null;
  created_at: string;
  updated_at: string;
  bill_items: BillItem[];
}

interface BillItem {
  id: string;
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

const BillHistory = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showAllBills, setShowAllBills] = useState(true);

  useEffect(() => {
    fetchBills();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('bill-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => fetchBills()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = bills;

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(bill =>
        bill.mobile_last_digit.includes(searchTerm) ||
        (bill.customer_name && bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by selected date (if not showing all bills)
    if (!showAllBills && selectedDate) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.created_at);
        const selectedDateStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const selectedDateEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
        
        return billDate >= selectedDateStart && billDate <= selectedDateEnd;
      });
    }

    setFilteredBills(filtered);
  }, [searchTerm, bills, selectedDate, showAllBills]);

  const fetchBills = async () => {
    try {
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select(`
          *,
          bill_items (
            id,
            food_item_name,
            price,
            quantity,
            total
          )
        `)
        .eq('status', 'completed') // Only show completed bills in history
        .order('created_at', { ascending: false });

      if (billsError) throw billsError;
      setBills(billsData || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bills",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillDetails(true);
  };


  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDate(undefined);
    setShowAllBills(true);
  };

  const getTotalSales = () => {
    return filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bill History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            {/* Search Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by mobile number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant={showAllBills ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllBills(true)}
                >
                  Show All Bills
                </Button>
                <Button 
                  variant={!showAllBills ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllBills(false)}
                >
                  Filter by Date
                </Button>
              </div>

              {!showAllBills && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Date:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {(searchTerm || (!showAllBills && selectedDate)) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Sales Summary */}
            {filteredBills.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {filteredBills.length} bill{filteredBills.length === 1 ? '' : 's'} found
                </span>
                <span className="text-sm font-medium">
                  Total Sales: ₹{getTotalSales().toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {filteredBills.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? "No bills found matching your search" : "No bills found"}
              </p>
            ) : (
              filteredBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">
                        {bill.customer_name || `Customer ***${bill.mobile_last_digit}`}
                      </p>
                      <Badge variant={bill.status === 'completed' ? 'default' : 'secondary'}>
                        {bill.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mobile: ***{bill.mobile_last_digit} • {bill.bill_items?.length || 0} items • ₹{bill.total} • {new Date(bill.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => viewBillDetails(bill)}>
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={showBillDetails} onOpenChange={setShowBillDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Customer Name</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBill.customer_name || 'Walk-in Customer'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Mobile</p>
                  <p className="text-sm text-muted-foreground">***{selectedBill.mobile_last_digit}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedBill.created_at).toLocaleDateString()}
                  </p>
                </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={selectedBill.status === 'completed' ? 'default' : 'secondary'}>
                      {selectedBill.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Mode</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBill.payment_mode || 'Not specified'}
                    </p>
                  </div>
                </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedBill.bill_items?.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{item.food_item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.price} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">₹{item.total}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{selectedBill.total}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillHistory;