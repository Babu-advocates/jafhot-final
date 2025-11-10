import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChefCharacter } from "@/components/ChefCharacter";
import { LoginForm } from "@/components/LoginForm";
import { DemoCredentials } from "@/components/DemoCredentials";
import { useAuth, type UserRole } from "@/hooks/useAuth";
const Login = () => {
  const [activeRole, setActiveRole] = useState<UserRole>("biller");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const {
    user,
    profile,
    signIn,
    loading
  } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (profile && !loading) {
      console.log('Profile available, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [profile, navigate, loading]);
  const handleRoleChange = (role: UserRole) => {
    if (role === activeRole) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveRole(role);
      setIsTransitioning(false);
    }, 150);
  };
  const handleLogin = async (email: string, password: string) => {
    console.log(`Attempting to login with role filter:`, {
      email,
      expectedRole: activeRole
    });
    const result = await signIn(email, password, activeRole);
    if (result.success) {
      console.log('Login successful, waiting for profile to load...');
      // Navigation will be handled by the useEffect above once profile is available
    } else {
      console.error('Login failed:', result.error);
    }
  };
  if (loading) {
    return <div className="min-h-screen restaurant-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>;
  }

  // Don't render login form if profile is already available
  if (profile) {
    return <div className="min-h-screen restaurant-gradient flex items-center justify-center">
        <div className="text-white text-xl">Redirecting to dashboard...</div>
      </div>;
  }
  return <div className="min-h-screen restaurant-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Chef Character */}
        <div className="hidden lg:flex justify-center items-center">
          <ChefCharacter />
        </div>

        {/* Right Side - Login Card */}
        <div className="flex justify-center lg:justify-start">
          <div className="login-card">
            {/* Tab Toggle */}
            <div className="relative bg-restaurant-gray-light rounded-lg p-1 mb-8">
              <div className={`tab-indicator ${activeRole === 'kitchen_manager' ? 'translate-x-full kitchen-manager' : 'translate-x-0'}`} style={{
              width: 'calc(50% - 4px)'
            }} />
              <div className="grid grid-cols-2 relative">
                <button onClick={() => handleRoleChange('biller')} className={`restaurant-btn-tab ${activeRole === 'biller' ? 'active' : ''}`}>Biller Login</button>
                <button onClick={() => handleRoleChange('kitchen_manager')} className={`restaurant-btn-tab kitchen-manager ${activeRole === 'kitchen_manager' ? 'active' : ''}`}>Kitchen Login</button>
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-sm text-restaurant-gray">
                Use the demo credentials below to sign in
              </p>
            </div>

            {/* Login Form */}
            <LoginForm role={activeRole} onLogin={handleLogin} isTransitioning={isTransitioning} />

            {/* Demo Credentials */}
            <DemoCredentials role={activeRole} />
          </div>
        </div>
      </div>
    </div>;
};
export default Login;