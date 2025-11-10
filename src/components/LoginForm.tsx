import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import type { UserRole } from "@/hooks/useAuth";
interface LoginFormProps {
  role: UserRole;
  onLogin: (email: string, password: string) => Promise<void>;
  isTransitioning: boolean;
}
export const LoginForm = ({
  role,
  onLogin,
  isTransitioning
}: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const roleTitle = role === "biller" ? "Biller" : "Kitchen Manager";
  const isKitchenManager = role === "kitchen_manager";
  return <div className={`login-form ${isTransitioning ? 'fade-out' : ''}`}>
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isKitchenManager ? 'text-restaurant-red' : 'text-restaurant-blue'}`}>
          Welcome Back
        </h1>
        <p className="text-restaurant-gray">
          Sign in to your Restaurant account as {roleTitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-5 h-5" />
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className={`restaurant-input pl-12 ${isKitchenManager ? 'kitchen-manager' : ''}`} required disabled={isLoading} />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray w-5 h-5" />
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={`restaurant-input pl-12 pr-12 ${isKitchenManager ? 'kitchen-manager' : ''}`} required disabled={isLoading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-restaurant-gray hover:transition-colors ${isKitchenManager ? 'hover:text-white' : 'hover:text-restaurant-blue'}`} disabled={isLoading}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" className={`restaurant-btn-primary ${isKitchenManager ? 'kitchen-manager' : ''}`} disabled={isLoading}>
          {isLoading ? 'Signing In...' : `Sign In as ${roleTitle}`}
        </button>
      </form>

      <div className="mt-6 text-center">
        
      </div>
    </div>;
};