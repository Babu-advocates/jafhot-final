import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cacheUtils, CACHE_KEYS } from "@/utils/cacheUtils";
import {
  fetchCategories,
  fetchFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  type FoodItem,
  type FoodCategory,
} from "@/lib/api";

interface LocalFoodItem extends FoodItem {
  category_name?: string;
}

export const FoodItemsManagement = () => {
  const [foodItems, setFoodItems] = useState<LocalFoodItem[]>([]);
  const [categories, setCategories] = useState<Pick<FoodCategory, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fkDialogOpen, setFkDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<LocalFoodItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    status: "available" as "available" | "unavailable"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const enrichItems = (items: FoodItem[], cats: Pick<FoodCategory, 'id' | 'name'>[]): LocalFoodItem[] => {
    const catMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
    return items.map(i => ({ ...i, category_name: catMap[i.category_id] || 'Unknown' }));
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Categories
      let categoriesData = cacheUtils.get<Pick<FoodCategory, 'id' | 'name'>[]>(CACHE_KEYS.CATEGORIES);
      if (!categoriesData) {
        const allCats = await fetchCategories();
        categoriesData = allCats.map(c => ({ id: c.id, name: c.name }));
        cacheUtils.set(CACHE_KEYS.CATEGORIES, categoriesData);
      }
      setCategories(categoriesData);

      // Food Items
      let itemsData = cacheUtils.get<FoodItem[]>(CACHE_KEYS.FOOD_ITEMS);
      if (!itemsData) {
        itemsData = await fetchFoodItems();
        cacheUtils.set(CACHE_KEYS.FOOD_ITEMS, itemsData);
      }
      setFoodItems(enrichItems(itemsData, categoriesData));
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.category_id) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      const itemData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        status: formData.status,
      };

      if (editingItem) {
        await updateFoodItem(editingItem.id, itemData);
        const updated: FoodItem = { ...editingItem, ...itemData };
        cacheUtils.updateItem(CACHE_KEYS.FOOD_ITEMS, updated);
        const cachedItems = cacheUtils.get<FoodItem[]>(CACHE_KEYS.FOOD_ITEMS) || [];
        setFoodItems(enrichItems(cachedItems, categories));
        toast({ title: "Success", description: "Food item updated successfully" });
      } else {
        const newItem = await createFoodItem(itemData);
        const cachedItems = cacheUtils.get<FoodItem[]>(CACHE_KEYS.FOOD_ITEMS) || [];
        const updated = [...cachedItems, newItem];
        cacheUtils.set(CACHE_KEYS.FOOD_ITEMS, updated);
        setFoodItems(enrichItems(updated, categories));
        toast({ title: "Success", description: "Food item added successfully" });
      }

      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error('Error saving food item:', error);
      toast({ title: "Error", description: "Failed to save food item", variant: "destructive" });
    }
  };

  const handleEdit = (item: LocalFoodItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category_id: item.category_id,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteFoodItem(itemToDelete);
      cacheUtils.removeItem(CACHE_KEYS.FOOD_ITEMS, itemToDelete);
      setFoodItems(prev => prev.filter(i => i.id !== itemToDelete));
      toast({ title: "Success", description: "Food item deleted successfully" });
    } catch (error: any) {
      // FK violation – offer to mark unavailable
      if (String(error?.message || '').includes('23503') || String(error?.code || '').includes('23503')) {
        setDeleteDialogOpen(false);
        setFkDialogOpen(true);
        return;
      }
      console.error('Error deleting food item:', error);
      toast({ title: "Error", description: "Failed to delete food item", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const markUnavailable = async () => {
    if (!itemToDelete) return;
    try {
      await updateFoodItem(itemToDelete, { status: 'unavailable' });
      const items = cacheUtils.get<FoodItem[]>(CACHE_KEYS.FOOD_ITEMS) || [];
      const updated = items.map(i => i.id === itemToDelete ? { ...i, status: 'unavailable' as const } : i);
      cacheUtils.set(CACHE_KEYS.FOOD_ITEMS, updated);
      setFoodItems(enrichItems(updated, categories));
      toast({ title: 'Marked as Unavailable', description: 'The item is now hidden from new orders.' });
    } catch (error) {
      console.error('Error marking item unavailable:', error);
      toast({ title: 'Error', description: 'Failed to mark item as unavailable', variant: 'destructive' });
    } finally {
      setFkDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleAvailability = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'unavailable' as const : 'available' as const;
    try {
      await updateFoodItem(itemId, { status: newStatus });
      const items = cacheUtils.get<FoodItem[]>(CACHE_KEYS.FOOD_ITEMS) || [];
      const updated = items.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
      cacheUtils.set(CACHE_KEYS.FOOD_ITEMS, updated);
      setFoodItems(enrichItems(updated, categories));
      toast({ title: 'Status Updated', description: `Item marked as ${newStatus}` });
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({ title: 'Error', description: 'Failed to update item status', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "", price: "", category_id: "", status: "available" });
  };

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-gray-900">Food Items</CardTitle>
            <p className="text-gray-900 text-sm mt-1">Manage your restaurant's food menu items</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-restaurant-blue hover:bg-restaurant-blue-hover">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Food Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Food Item' : 'Add New Food Item'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Item Name</label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter item name" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900">Category</label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900">Price (₹)</label>
                    <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="Enter price" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900">Status</label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as "available" | "unavailable" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-900">Description (Optional)</label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter item description" rows={3} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-restaurant-blue hover:bg-restaurant-blue-hover">
                      {editingItem ? 'Update' : 'Add'} Item
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search food items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8"><div className="text-gray-600">Loading food items...</div></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-600">
                {foodItems.length === 0 ? "No food items found. Add your first item!" : "No items match your search criteria."}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900">Name</TableHead>
                  <TableHead className="text-gray-900">Category</TableHead>
                  <TableHead className="text-gray-900">Price</TableHead>
                  <TableHead className="text-gray-900">Status</TableHead>
                  <TableHead className="text-gray-900 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-restaurant-blue/10 text-restaurant-blue border-restaurant-blue/20">
                        {item.category_name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">₹{item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'available' ? 'default' : 'secondary'}
                        className={item.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {item.status === 'available' ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                        {item.status === 'unavailable' && (
                          <Button size="sm" variant="outline" onClick={() => toggleAvailability(item.id, item.status)} className="text-green-600 hover:text-green-700">
                            Make Available
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleDeleteClick(item.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the food item from your menu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setItemToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={fkDialogOpen} onOpenChange={setFkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Item cannot be deleted</AlertDialogTitle>
            <AlertDialogDescription>This item has been used in previous bills and cannot be removed. You can mark it as unavailable so it no longer appears for new orders.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setFkDialogOpen(false); setItemToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={markUnavailable}>Mark as unavailable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};