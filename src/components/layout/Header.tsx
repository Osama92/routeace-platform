import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Settings, LogOut, HelpCircle, Menu } from "lucide-react";
import { useMobileSidebar } from "@/contexts/MobileSidebarContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import AvatarUpload from "@/components/shared/AvatarUpload";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header = ({ title, subtitle }: HeaderProps) => {
  const navigate = useNavigate();
  const { user, userRole, signOut, tenantMode } = useAuth();
  const { toggle: toggleMobileSidebar } = useMobileSidebar();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
  });

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const roleDisplay = getRoleDisplay(userRole, tenantMode);

  // Fetch avatar on mount (private bucket → resolve to signed URL)
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .single();

        if (data?.avatar_url) {
          const { resolveStorageUrl } = await import("@/lib/storage/signedUrl");
          const signed = await resolveStorageUrl("profile-pictures", data.avatar_url);
          setAvatarUrl(signed ?? null);
        }
      }
    };
    fetchAvatar();
  }, [user]);

  const handleOpenProfile = async () => {
    // Fetch current profile data
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          phone: data.phone || "",
        });
        const { resolveStorageUrl } = await import("@/lib/storage/signedUrl");
        setAvatarUrl(data.avatar_url ? await resolveStorageUrl("profile-pictures", data.avatar_url) : null);
      }
    }
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsProfileOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/access-hub", { replace: true });
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3 py-4 sm:py-6 px-4 sm:px-6 lg:px-8 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-30 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobileSidebar}
            className="lg:hidden shrink-0 -ml-2"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-fluid-xl sm:text-2xl font-heading font-bold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          {/* Command Bar Trigger */}
          <Button
            variant="outline"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="relative h-9 w-9 sm:w-auto sm:px-3 lg:w-64 justify-center sm:justify-start rounded-md border border-input bg-secondary/50 text-sm text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground"
            aria-label="Search commands"
          >
            <Search className="h-4 w-4 sm:mr-2" />
            <span className="hidden lg:inline-flex">Search commands...</span>
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 lg:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-foreground">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole ? roleDisplay.title : "User"}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenProfile} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              {(userRole === "admin" || userRole === "super_admin" || userRole === "org_admin") && (
                <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer">
                <HelpCircle className="w-4 h-4 mr-2" />
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center mb-4">
              {user && (
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={avatarUrl}
                  userInitials={userInitials}
                  onUploadComplete={(url) => setAvatarUrl(url)}
                  size="lg"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+234 800 123 4567"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={userRole ? roleDisplay.title : "No role assigned"}
                disabled
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
