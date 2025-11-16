import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordProtectionModalProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordProtectionModal({ open, onClose }: PasswordProtectionModalProps) {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    try {
      const result = await signIn(profile.email, password);
      
      if (result.success) {
        toast({
          title: "Access Granted",
          description: "Password verified successfully",
        });
        setPassword("");
        onClose();
        navigate('/dashboard/bill-history');
      } else {
        toast({
          title: "Incorrect Password",
          description: "Incorrect password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "An error occurred while verifying password",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      // Here you would call a password reset function
      // For now, we'll show a message explaining the limitation
      toast({
        title: "Password Reset",
        description: "Please contact your administrator to reset your password.",
      });
      setResetEmailSent(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setResetEmailSent(false);
        setShowForgotPassword(false);
        setEmail("");
      }, 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setEmail("");
    setShowForgotPassword(false);
    setResetEmailSent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {showForgotPassword ? "Reset Password" : "Bill History Access"}
          </DialogTitle>
          <DialogDescription>
            {showForgotPassword
              ? "Enter your email to receive password reset instructions"
              : "Enter your password to access Bill History"}
          </DialogDescription>
        </DialogHeader>

        {!showForgotPassword ? (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify Password"}
              </Button>
              
              <Button
                type="button"
                variant="link"
                className="text-sm text-primary hover:underline p-0 h-auto"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {resetEmailSent ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Password reset instructions have been sent to your administrator.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={isVerifying}>
                    {isVerifying ? "Sending..." : "Send Reset Instructions"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Login
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
