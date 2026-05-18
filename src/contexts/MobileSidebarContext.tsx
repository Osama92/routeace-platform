import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";

interface MobileSidebarContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export const MobileSidebarProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Auto-close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll while open on mobile
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <MobileSidebarContext.Provider value={{ open, setOpen, toggle: () => setOpen(!open) }}>
      {children}
    </MobileSidebarContext.Provider>
  );
};

export const useMobileSidebar = () => useContext(MobileSidebarContext);
