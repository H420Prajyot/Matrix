import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Bug, Building } from "lucide-react";
import LocalLoginForm from "@/components/LocalLoginForm";

export default function Landing() {
  const [showLocalLogin, setShowLocalLogin] = useState<'pentester' | 'client' | null>(null);

  const handleRoleLogin = (role: string) => {
    // Redirect to role-specific login endpoint
    window.location.href = `/api/login/${role}`;
  };

  const handleLocalLogin = (role: 'pentester' | 'client') => {
    setShowLocalLogin(role);
  };

  if (showLocalLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
        <LocalLoginForm 
          userType={showLocalLogin} 
          onBack={() => setShowLocalLogin(null)}
        />
      </div>
    );
  }

  const handleDevLogin = async (userId: string) => {
    try {
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Dev login failed');
      }
    } catch (error) {
      console.error('Dev login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="bg-card shadow-2xl rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-primary-foreground h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">SecureVAPT</h1>
          <p className="text-muted-foreground">Vulnerability Assessment & Penetration Testing Platform</p>
        </div>

        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Select Login Type</h2>
            <p className="text-sm text-muted-foreground">Choose your role to access the appropriate dashboard</p>
          </div>

          <Button
            onClick={() => handleRoleLogin('admin')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 px-6 h-auto justify-between group"
            data-testid="button-admin-login"
          >
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Administrator</div>
                <div className="text-sm opacity-90">Manage users, projects & system settings</div>
              </div>
            </div>
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>

          <div className="space-y-3">
            <div className="flex items-center">
              <Bug className="h-5 w-5 mr-3 text-emerald-600" />
              <span className="font-semibold text-foreground">Penetration Tester</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleLocalLogin('pentester')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                Username/Password
              </Button>
              <Button
                onClick={() => handleRoleLogin('pentester')}
                variant="outline"
                size="sm"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                SSO Login
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <Building className="h-5 w-5 mr-3 text-slate-600" />
              <span className="font-semibold text-foreground">Client</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleLocalLogin('client')}
                className="bg-slate-600 hover:bg-slate-700 text-white"
                size="sm"
              >
                Username/Password
              </Button>
              <Button
                onClick={() => handleRoleLogin('client')}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-600 hover:bg-slate-50"
              >
                SSO Login
              </Button>
            </div>
          </div>
        </div>

        {/* Development Testing Buttons */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-center mb-4">
            <h3 className="text-sm font-medium text-foreground mb-1">Development Testing</h3>
            <p className="text-xs text-muted-foreground">Quick access for testing different roles</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleDevLogin('admin-user-123')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Admin
            </Button>
            <Button
              onClick={() => handleDevLogin('pentester-user-456')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Pentester
            </Button>
            <Button
              onClick={() => handleDevLogin('client-user-789')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Client
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center">
            <Shield className="w-3 h-3 mr-1" />
            Secured with multi-factor authentication
          </p>
        </div>
      </div>
    </div>
  );
}
