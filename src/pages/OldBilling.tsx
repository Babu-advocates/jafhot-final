import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Printer, Edit, Trash2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FoodItemSelection } from "@/components/FoodItemSelection";

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Bill {
  id: string;
  customerName: string;
  mobileLastDigit: string;
  items: BillItem[];
  total: number;
  createdAt: Date;
}

const Billing = () => {
  const [activeTab, setActiveTab] = useState("billing");
  const [currentBill, setCurrentBill] = useState<Bill>({
    id: Date.now().toString(),
    customerName: "",
    mobileLastDigit: "",
    items: [],
    total: 0,
    createdAt: new Date()
  });
  const [drafts, setDrafts] = useState<Bill[]>([]);
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [showDraftConfirmation, setShowDraftConfirmation] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Bill | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Ref for print functionality
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load drafts from localStorage
    const savedDrafts = localStorage.getItem('billing-drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
  }, []);

  useEffect(() => {
    // Save drafts to localStorage
    localStorage.setItem('billing-drafts', JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    // Check if current bill has changes
    setHasUnsavedChanges(
      currentBill.customerName.length > 0 || 
      currentBill.mobileLastDigit.length > 0 || 
      currentBill.items.length > 0
    );
  }, [currentBill]);

  const handleTabChange = (value: string) => {
    if (value !== "billing" && hasUnsavedChanges && !editingDraft) {
      setPendingTabChange(value);
      setShowDraftConfirmation(true);
    } else {
      setActiveTab(value);
      if (value === "billing" && !editingDraft) {
        resetBill();
      }
    }
  };

  const resetBill = () => {
    setCurrentBill({
      id: Date.now().toString(),
      customerName: "",
      mobileLastDigit: "",
      items: [],
      total: 0,
      createdAt: new Date()
    });
    setHasUnsavedChanges(false);
    setEditingDraft(null);
  };

  const saveToDraft = () => {
    if (!currentBill.mobileLastDigit) {
      toast({
        title: "Mobile number required",
        description: "Please enter the last digit of mobile number",
        variant: "destructive"
      });
      return;
    }

    if (editingDraft) {
      // Update existing draft
      setDrafts(prev => prev.map(draft => 
        draft.id === editingDraft.id ? { ...currentBill, id: editingDraft.id } : draft
      ));
      toast({
        title: "Draft updated",
        description: "Bill has been updated in drafts"
      });
    } else {
      // Save as new draft
      const newDraft: Bill = {
        ...currentBill,
        id: Date.now().toString()
      };
      setDrafts(prev => [...prev, newDraft]);
      toast({
        title: "Saved to drafts",
        description: "Bill has been saved to drafts"
      });
    }

    resetBill();
    
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
    setShowDraftConfirmation(false);
  };

  const continueBilling = () => {
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
    setShowDraftConfirmation(false);
  };

  const addItemToBill = (item: any) => {
    const billItem: BillItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      total: item.total
    };

    setCurrentBill(prev => {
      const existingItemIndex = prev.items.findIndex(i => i.id === item.id);
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
  };

  const removeItemFromBill = (itemId: string) => {
    setCurrentBill(prev => {
      const newItems = prev.items.filter(item => item.id !== itemId);
      const newTotal = newItems.reduce((sum, item) => sum + item.total, 0);
      
      return {
        ...prev,
        items: newItems,
        total: newTotal
      };
    });
  };

  const openDraft = (draft: Bill) => {
    setCurrentBill({ ...draft });
    setEditingDraft(draft);
    setActiveTab("billing");
  };

  const deleteDraft = (draftId: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== draftId));
    toast({
      title: "Draft deleted",
      description: "Draft has been removed"
    });
  };

  const printBill = () => {
    if (!currentBill.mobileLastDigit) {
      toast({
        title: "Mobile number required",
        description: "Please enter the last digit of mobile number",
        variant: "destructive"
      });
      return;
    }

    if (currentBill.items.length === 0) {
      toast({
        title: "No items",
        description: "Please add items to the bill before printing",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill - ${currentBill.mobileLastDigit}</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .bill-details { margin: 20px 0; }
              .items-table { width: 100%; border-collapse: collapse; }
              .items-table th, .items-table td { text-align: left; padding: 5px; }
              .total { font-weight: bold; font-size: 14px; }
              .separator { border-top: 1px dashed #000; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>TASTY BITE</h2>
              <p>MARAIKAR PALLIVASAL 2nd STREET</p>
              <p>TENKASI</p>
              <p>Phone: 7358921445, 7548881441</p>
              <p>Company name: Techverse infotech Private Limited</p>
            </div>
            <div class="separator"></div>
            <div class="bill-details">
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <p>Customer: ${currentBill.customerName || 'Walk-in Customer'}</p>
              <p>Mobile: ***${currentBill.mobileLastDigit}</p>
            </div>
            <div class="separator"></div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Amt</th>
                </tr>
              </thead>
              <tbody>
                ${currentBill.items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="separator"></div>
            <div class="total">
              <p>Total: ₹${currentBill.total.toFixed(2)}</p>
              <p>Net Payable: ₹${currentBill.total.toFixed(2)}</p>
            </div>
            <div class="separator"></div>
            <div style="text-align: center; margin-top: 20px;">
              <p>THANK YOU, VISIT US AGAIN!</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      
      // Reset bill after printing
      resetBill();
      
      toast({
        title: "Bill printed",
        description: "Bill has been sent to printer"
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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                        value={currentBill.mobileLastDigit}
                        onChange={(e) => setCurrentBill(prev => ({ ...prev, mobileLastDigit: e.target.value }))}
                        maxLength={4}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerName">Customer Name (Optional)</Label>
                      <Input
                        id="customerName"
                        placeholder="Enter customer name"
                        value={currentBill.customerName}
                        onChange={(e) => setCurrentBill(prev => ({ ...prev, customerName: e.target.value }))}
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
                        <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ₹{item.price} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{item.total}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromBill(item.id)}
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
              <div className="flex gap-4">
                {editingDraft && (
                  <Button onClick={saveToDraft} variant="outline" className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Update Draft
                  </Button>
                )}
                <Button onClick={printBill} className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print Bill
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Draft Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  {drafts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No draft bills</p>
                  ) : (
                    <div className="space-y-4">
                      {drafts.map((draft) => (
                        <div key={draft.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {draft.customerName || `Customer ***${draft.mobileLastDigit}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {draft.items.length} items • ₹{draft.total} • {new Date(draft.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openDraft(draft)}>
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteDraft(draft.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Draft Confirmation Dialog */}
      <Dialog open={showDraftConfirmation} onOpenChange={setShowDraftConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You have unsaved changes. Would you like to save this bill as a draft?
          </p>
          <div className="flex gap-4 mt-4">
            <Button onClick={saveToDraft} className="flex-1">Save to Draft</Button>
            <Button variant="outline" onClick={continueBilling} className="flex-1">Continue Without Saving</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;