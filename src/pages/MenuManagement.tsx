import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManagement } from "@/components/CategoryManagement";
import { FoodItemsManagement } from "@/components/FoodItemsManagement";

const MenuManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Food Items Management</h1>
        <p className="text-gray-900 mt-2">Manage your restaurant's food menu items and categories</p>
      </div>

      <Tabs defaultValue="food-items" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="food-items">Food Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="food-items">
          <FoodItemsManagement />
        </TabsContent>
        
        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuManagement;