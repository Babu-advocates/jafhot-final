import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, Search, Printer, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FoodItemSelection } from "@/components/FoodItemSelection";
import { supabase } from "@/integrations/supabase/client";
import { printBill as printBillUtil } from "@/utils/billPrint";

interface BillItem {
  id: string;
  food_item_id: string;
  food_item_name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Bill {
  id?: string;
  customer_name: string;
  mobile_last_digit: string;
  items: BillItem[];
  total: number;
  status: 'draft' | 'completed';
}

interface DatabaseBill {
  id: string;
  customer_name: string | null;
  mobile_last_digit: string;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  bill_items: {
    id: string;
    food_item_name: string;
    price: number;
    quantity: number;
    total: number;
    food_item_id: string;
  }[];
}

const NewBilling = () => {
  const [activeTab, setActiveTab] = useState("billing");
  const [currentBill, setCurrentBill] = useState<Bill>({
    customer_name: "",
    mobile_last_digit: "",
    items: [],
    total: 0,
    status: 'draft'
  });
  const [drafts, setDrafts] = useState<DatabaseBill[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<DatabaseBill[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [editingDraft, setEditingDraft] = useState<DatabaseBill | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewingDraft, setViewingDraft] = useState<DatabaseBill | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPaymentModeDialog, setShowPaymentModeDialog] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'cash' | 'online' | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DatabaseBill | null>(null);

  useEffect(() => {
    fetchDrafts();
    
    // Set up real-time subscription for drafts and bill items
    const channel = supabase
      .channel('draft-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => fetchDrafts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_items'
        },
        () => fetchDrafts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Filter drafts based on search term
    if (searchTerm.trim() === "") {
      setFilteredDrafts(drafts);
    } else {
      const filtered = drafts.filter(draft =>
        draft.mobile_last_digit.includes(searchTerm) ||
        (draft.customer_name && draft.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDrafts(filtered);
    }
  }, [searchTerm, drafts]);

  useEffect(() => {
    // Check if current bill has changes
    setHasUnsavedChanges(
      currentBill.customer_name.length > 0 || 
      currentBill.mobile_last_digit.length > 0 || 
      currentBill.items.length > 0
    );
  }, [currentBill]);

  const fetchDrafts = async () => {
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
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch drafts",
        variant: "destructive"
      });
    }
  };

  const resetBill = () => {
    setCurrentBill({
      customer_name: "",
      mobile_last_digit: "",
      items: [],
      total: 0,
      status: 'draft'
    });
    setHasUnsavedChanges(false);
    setEditingDraft(null);
  };

  const saveToDraft = async () => {
    if (!currentBill.mobile_last_digit) {
      toast({
        title: "Mobile number required",
        description: "Please enter the last digit of mobile number",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingDraft) {
        // Calculate differences between current and previous items
        const previousItems = editingDraft.bill_items || [];
        const currentItems = currentBill.items;
        
        // Find new items or items with increased quantity
        const diffItems = [];
        
        for (const currentItem of currentItems) {
          const previousItem = previousItems.find(p => p.food_item_id === currentItem.food_item_id);
          
          if (!previousItem) {
            // Completely new item
            diffItems.push(currentItem);
          } else if (currentItem.quantity > previousItem.quantity) {
            // Increased quantity - only send the difference
            const quantityDiff = currentItem.quantity - previousItem.quantity;
            diffItems.push({
              ...currentItem,
              quantity: quantityDiff,
              total: quantityDiff * currentItem.price
            });
          }
        }

        if (diffItems.length > 0) {
          // Create new active order with only the differences
          const diffTotal = diffItems.reduce((sum, item) => sum + item.total, 0);
          
          const { data: billData, error: billError } = await supabase
            .from('bills')
            .insert({
              customer_name: currentBill.customer_name || null,
              mobile_last_digit: currentBill.mobile_last_digit + " (Additional)",
              total: diffTotal,
              status: 'active', // Send differences to kitchen
            })
            .select()
            .single();

          if (billError) throw billError;

          // Insert only the difference items
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(
              diffItems.map(item => ({
                bill_id: billData.id,
                food_item_id: item.food_item_id,
                food_item_name: item.food_item_name,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
              }))
            );

          if (itemsError) throw itemsError;

          toast({
            title: "Additional items sent to kitchen",
            description: `${diffItems.length} new/additional items sent to kitchen`
          });
        }

        if (diffItems.length === 0) {
          // Update the original draft with all current items (no additional items to send)
          const { error: billError } = await supabase
            .from('bills')
            .update({
              customer_name: currentBill.customer_name || null,
              mobile_last_digit: currentBill.mobile_last_digit,
              total: currentBill.total,
            })
            .eq('id', editingDraft.id);

          if (billError) throw billError;

          // Delete existing bill items
          await supabase
            .from('bill_items')
            .delete()
            .eq('bill_id', editingDraft.id);

          // Insert all current bill items
          if (currentBill.items.length > 0) {
            const { error: itemsError } = await supabase
              .from('bill_items')
              .insert(
                currentBill.items.map(item => ({
                  bill_id: editingDraft.id,
                  food_item_id: item.food_item_id,
                  food_item_name: item.food_item_name,
                  price: item.price,
                  quantity: item.quantity,
                  total: item.total,
                }))
              );

            if (itemsError) throw itemsError;
          }

          toast({
            title: "Draft updated",
            description: "No new items to send to kitchen"
          });
        }
      } else {
        // Create new order for kitchen
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .insert({
            customer_name: currentBill.customer_name || null,
            mobile_last_digit: currentBill.mobile_last_digit,
            total: currentBill.total,
            status: 'active', // Send to kitchen as active order
          })
          .select()
          .single();

        if (billError) throw billError;

        // Insert bill items
        if (currentBill.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(
              currentBill.items.map(item => ({
                bill_id: billData.id,
                food_item_id: item.food_item_id,
                food_item_name: item.food_item_name,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
              }))
            );

          if (itemsError) throw itemsError;
        }

        toast({
          title: "Order sent to kitchen",
          description: "Order has been sent to kitchen and will appear in active orders"
        });
      }

      resetBill();
      setActiveTab("drafts");
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive"
      });
    }
  };

  const addItemToBill = (item: any) => {
    const billItem: BillItem = {
      id: item.id,
      food_item_id: item.id,
      food_item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.total
    };

    setCurrentBill(prev => {
      const existingItemIndex = prev.items.findIndex(i => i.food_item_id === item.id);
      let newItems;
      
      if (existingItemIndex >= 0) {
        // Update existing item
        newItems = prev.items.map((i, index) => 
          index === existingItemIndex 
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
            : i
        );
      } else {
        // Add new item
        newItems = [...prev.items, billItem];
      }

      const newTotal = newItems.reduce((sum, i) => sum + i.total, 0);

      return {
        ...prev,
        items: newItems,
        total: newTotal
      };
    });

    toast({
      title: "Item added",
      description: `${item.name} has been added to the bill`
    });
    
    // Keep dialog open for adding more items - form will reset in FoodItemSelection
  };

  const removeItemFromBill = (itemId: string) => {
    setCurrentBill(prev => {
      const newItems = prev.items.filter(item => item.food_item_id !== itemId);
      const newTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      
      return {
        ...prev,
        items: newItems,
        total: newTotal
      };
    });
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromBill(itemId);
      return;
    }

    setCurrentBill(prev => {
      const newItems = prev.items.map(item => 
        item.food_item_id === itemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      );
      const newTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      
      return {
        ...prev,
        items: newItems,
        total: newTotal
      };
    });
  };

  const increaseQuantity = (itemId: string) => {
    const item = currentBill.items.find(i => i.food_item_id === itemId);
    if (item) {
      updateItemQuantity(itemId, item.quantity + 1);
    }
  };

  const decreaseQuantity = (itemId: string) => {
    const item = currentBill.items.find(i => i.food_item_id === itemId);
    if (item) {
      updateItemQuantity(itemId, item.quantity - 1);
    }
  };

  const openDraft = (draft: DatabaseBill) => {
    setCurrentBill({
      customer_name: draft.customer_name || "",
      mobile_last_digit: draft.mobile_last_digit,
      items: draft.bill_items.map(item => ({
        id: item.id,
        food_item_id: item.food_item_id,
        food_item_name: item.food_item_name,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
      })),
      total: draft.total,
      status: 'draft'
    });
    setEditingDraft(draft);
    setActiveTab("billing");
  };

  const printBill = async () => {
    if (!currentBill.mobile_last_digit) {
      toast({
        title: "Mobile number required",
        description: "Please enter the last digit of mobile number",
        variant: "destructive"
      });
      return;
    }

    if (currentBill.items.length === 0) {
      toast({
        title: "No items to print",
        description: "Please add items to the bill",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingDraft) {
        // Update existing draft
        const { error: billError } = await supabase
          .from('bills')
          .update({
            customer_name: currentBill.customer_name || null,
            mobile_last_digit: currentBill.mobile_last_digit,
            total: currentBill.total,
          })
          .eq('id', editingDraft.id);

        if (billError) throw billError;

        // Delete existing bill items
        await supabase
          .from('bill_items')
          .delete()
          .eq('bill_id', editingDraft.id);

        // Insert new bill items
        if (currentBill.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(
              currentBill.items.map(item => ({
                bill_id: editingDraft.id,
                food_item_id: item.food_item_id,
                food_item_name: item.food_item_name,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
              }))
            );

          if (itemsError) throw itemsError;
        }
      } else {
        // Create new draft bill
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .insert({
            customer_name: currentBill.customer_name || null,
            mobile_last_digit: currentBill.mobile_last_digit,
            total: currentBill.total,
            status: 'draft', // Save as draft when printing
          })
          .select()
          .single();

        if (billError) throw billError;

        // Insert bill items
        if (currentBill.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('bill_items')
            .insert(
              currentBill.items.map(item => ({
                bill_id: billData.id,
                food_item_id: item.food_item_id,
                food_item_name: item.food_item_name,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
              }))
            );

          if (itemsError) throw itemsError;
        }
      }

      // Print the bill without amounts (just items and quantities)
      printBillUtil(currentBill, false);

      toast({
        title: "Bill printed successfully",
        description: "Order has been saved as draft"
      });

      resetBill();
      setActiveTab("drafts");
    } catch (error) {
      console.error('Error printing bill:', error);
      toast({
        title: "Error",
        description: "Failed to print bill",
        variant: "destructive"
      });
    }
  };

  const handleViewDraft = (draft: DatabaseBill) => {
    setPendingDraft(draft);
    setShowPaymentModeDialog(true);
  };

  const handlePaymentModeSelect = (mode: 'cash' | 'online') => {
    setSelectedPaymentMode(mode);
    setShowPaymentModeDialog(false);
    if (pendingDraft) {
      viewDraft(pendingDraft);
    }
  };

  const viewDraft = (draft: DatabaseBill) => {
    setViewingDraft(draft);
    setShowViewDialog(true);
  };

  const addItemToViewingDraft = (item: any) => {
    if (!viewingDraft) return;

    const billItem = {
      id: item.id,
      food_item_id: item.id,
      food_item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.total
    };

    setViewingDraft(prev => {
      if (!prev) return prev;
      
      const existingItemIndex = prev.bill_items.findIndex(i => i.food_item_id === item.id);
      let newItems;
      
      if (existingItemIndex >= 0) {
        newItems = prev.bill_items.map((i, index) => 
          index === existingItemIndex 
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
            : i
        );
      } else {
        newItems = [...prev.bill_items, billItem];
      }

      const newTotal = newItems.reduce((sum, i) => sum + i.total, 0);

      return {
        ...prev,
        bill_items: newItems,
        total: newTotal
      };
    });

    toast({
      title: "Item added",
      description: `${item.name} has been added to the draft`
    });
  };

  const updateViewingDraftItemQuantity = (itemId: string, newQuantity: number) => {
    if (!viewingDraft) return;

    if (newQuantity <= 0) {
      setViewingDraft(prev => {
        if (!prev) return prev;
        const newItems = prev.bill_items.filter(item => item.food_item_id !== itemId);
        const newTotal = newItems.reduce((sum, item) => sum + item.total, 0);
        return { ...prev, bill_items: newItems, total: newTotal };
      });
      return;
    }

    setViewingDraft(prev => {
      if (!prev) return prev;
      const newItems = prev.bill_items.map(item => 
        item.food_item_id === itemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      );
      const newTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      return { ...prev, bill_items: newItems, total: newTotal };
    });
  };

  const printViewingDraft = async () => {
    if (!viewingDraft || !selectedPaymentMode) return;

    try {
      // Update the draft in database
      const { error: billError } = await supabase
        .from('bills')
        .update({
          customer_name: viewingDraft.customer_name || null,
          mobile_last_digit: viewingDraft.mobile_last_digit,
          total: viewingDraft.total,
          status: 'completed',
          payment_mode: selectedPaymentMode
        })
        .eq('id', viewingDraft.id);

      if (billError) throw billError;

      // Delete existing bill items
      await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', viewingDraft.id);

      // Insert updated bill items
      if (viewingDraft.bill_items.length > 0) {
        const { error: itemsError } = await supabase
          .from('bill_items')
          .insert(
            viewingDraft.bill_items.map(item => ({
              bill_id: viewingDraft.id,
              food_item_id: item.food_item_id,
              food_item_name: item.food_item_name,
              price: item.price,
              quantity: item.quantity,
              total: item.total,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Print the bill with amounts and payment mode
      printBillUtil({
        customer_name: viewingDraft.customer_name,
        mobile_last_digit: viewingDraft.mobile_last_digit,
        total: viewingDraft.total,
        created_at: viewingDraft.created_at,
        bill_items: viewingDraft.bill_items,
        payment_mode: selectedPaymentMode
      }, true);

      toast({
        title: "Bill printed successfully",
        description: `Bill has been moved to history (Payment: ${selectedPaymentMode})`
      });

      setShowViewDialog(false);
      setViewingDraft(null);
      setSelectedPaymentMode(null);
      setPendingDraft(null);
    } catch (error) {
      console.error('Error printing draft:', error);
      toast({
        title: "Error",
        description: "Failed to print bill",
        variant: "destructive"
      });
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      toast({
        title: "Draft deleted",
        description: "Draft has been removed"
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Restaurant Billing System</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mobileLastDigit">Mobile Last Digit *</Label>
                      <Input
                        id="mobileLastDigit"
                        placeholder="Enter last digit"
                        value={currentBill.mobile_last_digit}
                        onChange={(e) => setCurrentBill(prev => ({ ...prev, mobile_last_digit: e.target.value }))}
                        maxLength={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerName">Customer Name (Optional)</Label>
                      <Input
                        id="customerName"
                        placeholder="Enter customer name"
                        value={currentBill.customer_name}
                        onChange={(e) => setCurrentBill(prev => ({ ...prev, customer_name: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                  <Button onClick={() => setShowFoodSelection(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent>
                  {currentBill.items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No items added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {currentBill.items.map((item, index) => (
                        <div key={`${item.food_item_id}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.food_item_name}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{item.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-background rounded-md border">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => decreaseQuantity(item.food_item_id)}
                              >
                                -
                              </Button>
                              <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => increaseQuantity(item.food_item_id)}
                              >
                                +
                              </Button>
                            </div>
                            <span className="font-medium min-w-[4rem] text-right">₹{item.total.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromBill(item.food_item_id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>₹{currentBill.total}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between gap-4">
                <Button 
                  onClick={printBill} 
                  variant="destructive" 
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Bill
                </Button>
                <Button onClick={saveToDraft} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingDraft ? 'Update Order' : 'Send to Kitchen'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Draft Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by mobile number or customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {filteredDrafts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "No draft bills found matching your search" : "No draft bills"}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {filteredDrafts.map((draft) => (
                        <div key={draft.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {draft.customer_name || `Customer ***${draft.mobile_last_digit}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Mobile: ***{draft.mobile_last_digit} • {draft.bill_items?.length || 0} items • ₹{draft.total} • {new Date(draft.created_at).toLocaleDateString()}
                            </p>
                          </div>
                           <div className="flex items-center gap-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleViewDraft(draft)}
                               className="flex items-center gap-2"
                             >
                               <Eye className="w-4 h-4" />
                               View
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => deleteDraft(draft.id)}
                               className="text-red-500 hover:text-red-700 flex items-center gap-2"
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Food Item Selection Dialog */}
      <FoodItemSelection
        isOpen={showFoodSelection}
        onClose={() => setShowFoodSelection(false)}
        onAddItem={addItemToBill}
      />

      {/* View Draft Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft Bill Details</DialogTitle>
          </DialogHeader>
          
          {viewingDraft && (
            <div className="space-y-4">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Mobile Number</Label>
                      <p className="text-sm font-medium">***{viewingDraft.mobile_last_digit}</p>
                    </div>
                    <div>
                      <Label>Customer Name</Label>
                      <p className="text-sm font-medium">{viewingDraft.customer_name || 'Walk-in Customer'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <p className="text-sm font-medium">{new Date(viewingDraft.created_at).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                  <Button onClick={() => setShowFoodSelection(true)} size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent>
                  {viewingDraft.bill_items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No items in this draft</p>
                  ) : (
                    <div className="space-y-2">
                      {viewingDraft.bill_items.map((item, index) => (
                        <div key={`${item.food_item_id}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.food_item_name}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-background rounded-md border">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateViewingDraftItemQuantity(item.food_item_id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateViewingDraftItemQuantity(item.food_item_id, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            <span className="font-medium min-w-[4rem] text-right">₹{item.total.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Net Payable:</span>
                        <span>₹{viewingDraft.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                  Close
                </Button>
                <Button onClick={printViewingDraft} className="bg-black text-white hover:bg-black/90 flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print Bill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Food Item Selection for Viewing Draft */}
      {showViewDialog && (
        <FoodItemSelection
          isOpen={showFoodSelection}
          onClose={() => setShowFoodSelection(false)}
          onAddItem={addItemToViewingDraft}
        />
      )}

      {/* Payment Mode Selection Dialog */}
      <Dialog open={showPaymentModeDialog} onOpenChange={setShowPaymentModeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose the payment method for this bill:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handlePaymentModeSelect('cash')}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                <span className="text-2xl">💵</span>
                <span>Cash</span>
              </Button>
              <Button
                onClick={() => handlePaymentModeSelect('online')}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                <span className="text-2xl">💳</span>
                <span>Online</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewBilling;