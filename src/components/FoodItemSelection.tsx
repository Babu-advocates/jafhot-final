import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  food_categories: { name: string } | null;
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
      const { data, error } = await supabase
        .from('food_items')
        .select('*, food_categories(name)')
        .eq('status', 'available')
        .order('name');

      if (error) throw error;
      setFoodItems(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch food items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('food_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    }
  };

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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Food Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
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

          {/* Item Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Food Item</label>
            <Select value={selectedItem?.id || ""} onValueChange={(value) => {
              const item = foodItems.find(item => item.id === value);
              if (item) handleItemSelect(item);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a food item">
                  {selectedItem && (
                    <span className="flex items-center gap-2">
                      {selectedItem.name}
                      <span className="text-green-600 font-medium">₹{selectedItem.price}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  filteredItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{item.name}</span>
                        <span className="text-green-600 font-medium ml-4">₹{item.price}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            {!isManualQuantity ? (
              <div className="flex gap-2">
                <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
               <SelectContent side="bottom" align="start">
                 {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                   <SelectItem key={num} value={num.toString()}>
                     {num}
                   </SelectItem>
                 ))}
               </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsManualQuantity(true)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full"
              />
            )}
          </div>

          {/* Item Details */}
          {selectedItem && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
              {selectedItem.description && (
                <p className="text-muted-foreground">{selectedItem.description}</p>
              )}
              <div className="flex justify-between items-center">
                <span>Unit Price: ₹{selectedItem.price}</span>
                <span className="font-semibold text-lg">Total: ₹{total}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleAddItem}
              disabled={!selectedItem}
              className="flex-1 bg-primary text-primary-foreground"
            >
              Add Item
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}