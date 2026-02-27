import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fetchFoodItems as apiFetchFoodItems, fetchCategories as apiFetchCategories } from "@/lib/api";

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
}

interface SelectedItem extends FoodItem {
  quantity: number;
  total: number;
}

interface FoodItemSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: SelectedItem) => void;
}

export function FoodItemSelection({ isOpen, onClose, onAddItem }: FoodItemSelectionProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isManualQuantity, setIsManualQuantity] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFoodItems();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchFoodItems = async () => {
    setLoading(true);
    try {
      const [allItems, allCats] = await Promise.all([
        apiFetchFoodItems(),
        apiFetchCategories(),
      ]);
      const catMap = Object.fromEntries(allCats.map(c => [c.id, c.name]));
      const available = allItems
        .filter(i => i.status === 'available')
        .map(i => ({ ...i, category_name: catMap[i.category_id] || '' }));
      setFoodItems(available);
      setCategories(allCats);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch food items", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {};

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleItemSelect = (item: FoodItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setIsManualQuantity(false);
  };

  const handleAddItem = () => {
    if (!selectedItem) return;

    const itemWithQuantity: SelectedItem = {
      ...selectedItem,
      quantity,
      total: selectedItem.price * quantity
    };

    onAddItem(itemWithQuantity);
    
    // Reset form but keep dialog open for adding more items
    setSelectedItem(null);
    setQuantity(1);
    setIsManualQuantity(false);
    setSearchTerm("");
    setSelectedCategory("all");
    
    toast({
      title: "Item added",
      description: "You can add more items or close to continue"
    });
  };

  const total = selectedItem ? selectedItem.price * quantity : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Food Item</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col min-h-0 flex-1 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 shrink-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search food items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Food Items Grid (Scrollable) */}
          <div className="flex flex-col flex-1 min-h-0 space-y-2">
            <label className="text-sm font-medium shrink-0">Available Items</label>
            <div className="flex-1 overflow-y-auto border rounded-lg p-2 bg-background min-h-[150px]">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading items...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || selectedCategory !== "all" 
                    ? "No items found matching your search"
                    : "No items available"}
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-accent border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          {item.category_name && (
                            <div className="text-xs opacity-80 mt-0.5 truncate">
                              {item.category_name}
                            </div>
                          )}
                        </div>
                        <div className="font-semibold shrink-0">
                          ₹{item.price || 0}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Area (Fixed) */}
          <div className="shrink-0 space-y-4 pt-2">
            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Item Details */}
            {selectedItem && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
                {selectedItem.description && (
                  <p className="text-muted-foreground text-sm">{selectedItem.description}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">Unit Price: ₹{selectedItem.price || 0}</span>
                  <span className="font-semibold text-lg">Total: ₹{total}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddItem}
                disabled={!selectedItem}
                className="flex-1"
              >
                Add Item
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}