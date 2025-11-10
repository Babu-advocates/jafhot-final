
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/hooks/useAuth";

interface SignUpFormProps {
  role: UserRole;
  onSignUpSuccess: () => void;
  isTransitioning: boolean;
}

export const SignUpForm = ({ role, onSignUpSuccess, isTransitioning }: SignUpFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role: role,
            full_name: fullName,
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
        onSignUpSuccess();
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign Up Error",
        description: "An unexpected error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleTitle = role === "biller" ? "Biller" : "Kitchen Manager";
  const isKitchenManager = role === "kitchen_manager";

  return (
    <div className={`login-form ${isTransitioning ? 'fade-out' : ''}`}>
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isKitchenManager ? 'text-restaurant-red' : 'text-restaurant-blue'}`}>
          Create Account
        </h1>
        <p className="text-restaurant-gray">
          Sign up as {roleTitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-5 h-5" />
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`restaurant-input pl-12 ${isKitchenManager ? 'kitchen-manager' : ''}`}
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-5 h-5" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`restaurant-input pl-12 ${isKitchenManager ? 'kitchen-manager' : ''}`}
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-5 h-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`restaurant-input pl-12 pr-12 ${isKitchenManager ? 'kitchen-manager' : ''}`}
              required
              disabled={isLoading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray hover:transition-colors ${
                isKitchenManager ? 'hover:text-restaurant-red' : 'hover:text-restaurant-blue'
              }`}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className={`restaurant-btn-primary ${isKitchenManager ? 'kitchen-manager' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : `Sign Up as ${roleTitle}`}
        </button>
      </form>
    </div>
  );
};
