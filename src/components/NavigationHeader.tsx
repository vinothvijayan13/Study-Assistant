import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, User, LogOut, History, Settings, Brain, MessageCircle } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import { toast } from "sonner";
import AuthModal from "./AuthModal";

interface NavigationHeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const NavigationHeader = ({ currentView, onViewChange }: NavigationHeaderProps) => {
  const [user, loading] = useAuthState(auth);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      onViewChange("study");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { id: "study", label: "Study Assistant", icon: Brain },
    { id: "arivu", label: "Arivu Chat", icon: MessageCircle },
    { id: "history", label: "Study History", icon: History },
    { id: "profile", label: "Profile", icon: Settings },
  ];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-elegant border-b border-gray-200 sticky top-0 z-50 shadow-elegant transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md pulse-glow">
                <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold gradient-text">
                  Ram's AI
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-3 lg:px-4 ${
                    currentView === item.id 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" 
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Button>
              ))}
            </nav>

            {/* User Section */}
            <div className="flex items-center gap-2 md:gap-4">
              {user ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">
                      +91{user.phoneNumber?.replace('+91', '')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 hover:scale-105"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary flex items-center gap-2 px-3 md:px-4"
                  disabled={loading}
                  size="sm"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm">Login</span>
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-gray-200 bg-white/95 backdrop-blur-elegant animate-fadeInUp">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full justify-start flex items-center gap-3 px-4 py-3 ${
                      currentView === item.id 
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md" 
                        : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    } transition-all duration-300`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          toast.success("Welcome to Ram's AI!");
        }}
      />
    </>
  );
};

export default NavigationHeader;
