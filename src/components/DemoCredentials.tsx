
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/hooks/useAuth";

interface DemoCredentialsProps {
  role: UserRole;
}

export const DemoCredentials = ({ role }: DemoCredentialsProps) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const credentials = {
    biller: {
      email: "biller@gmail.com",
      password: "biller123"
    },
    kitchen_manager: {
      email: "kitchen@gmail.com", 
      password: "kitchen123"
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentCredentials = credentials[role];

  return (
    <div className="demo-box mt-6">
      <h3 className="text-sm font-semibold text-restaurant-gray mb-3">Demo Credentials</h3>
      <p className="text-xs text-restaurant-gray mb-3 opacity-70">
        Use these credentials to access the application with profile-based authentication
      </p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-restaurant-gray">Email:</span>
          <div className="flex items-center space-x-2">
            <code className="text-xs bg-white px-2 py-1 rounded border">
              {currentCredentials.email}
            </code>
            <button
              onClick={() => copyToClipboard(currentCredentials.email, 'email')}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              {copiedField === 'email' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-restaurant-gray" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-restaurant-gray">Password:</span>
          <div className="flex items-center space-x-2">
            <code className="text-xs bg-white px-2 py-1 rounded border">
              {currentCredentials.password}
            </code>
            <button
              onClick={() => copyToClipboard(currentCredentials.password, 'password')}
              className="p-1 hover:bg-white rounded transition-colors"
            >
              {copiedField === 'password' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-restaurant-gray" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
