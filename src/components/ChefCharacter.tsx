
import { useEffect, useState } from "react";

export const ChefCharacter = () => {
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    // Generate a 3D cartoon chef character
    const generateChefImage = async () => {
      try {
        // For now, we'll use a placeholder that represents our chef
        // In production, you could integrate with an AI image generation service
        setImageUrl("https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=600&fit=crop&crop=center");
      } catch (error) {
        console.error("Failed to generate chef image:", error);
        // Fallback to a cooking-related image
        setImageUrl("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop&crop=center");
      }
    };

    generateChefImage();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <div className="chef-bounce">
          <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
            <img 
              src={imageUrl} 
              alt="3D Cartoon Chef Character"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback image if the main image fails to load
                e.currentTarget.src = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop&crop=center";
              }}
            />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-restaurant-blue rounded-full animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-yellow-400 rounded-full animate-bounce"></div>
      </div>
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-restaurant-gray">Welcome Chef!</h2>
        <p className="text-restaurant-gray opacity-80">Manage your restaurant with ease</p>
      </div>
    </div>
  );
};
