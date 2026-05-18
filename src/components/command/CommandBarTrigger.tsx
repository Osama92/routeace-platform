import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommandBarTriggerProps {
  onClick: () => void;
}

const CommandBarTrigger = ({ onClick }: CommandBarTriggerProps) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="relative h-9 w-64 justify-start rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground"
    >
      <Search className="mr-2 h-4 w-4" />
      <span className="hidden lg:inline-flex">Search commands...</span>
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
};

export default CommandBarTrigger;
