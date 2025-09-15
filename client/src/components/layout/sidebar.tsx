import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Gauge, 
  Users, 
  ChartGantt, 
  FileText, 
  History, 
  Settings,
  Bug,
  AlertTriangle,
  Upload,
  Wrench,
  Building,
  Download,
  Clock
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

interface SidebarProps {
  items: SidebarItem[];
  onItemClick: (id: string) => void;
  activeColor?: string;
}

const iconMap = {
  'tachometer-alt': Gauge,
  'users': Users,
  'project-diagram': ChartGantt,
  'file-alt': FileText,
  'history': History,
  'cog': Settings,
  'bug': Bug,
  'exclamation-triangle': AlertTriangle,
  'file-upload': Upload,
  'tools': Wrench,
  'building': Building,
  'file-download': Download,
  'clock': Clock,
};

export default function Sidebar({ items, onItemClick, activeColor = "bg-primary text-primary-foreground" }: SidebarProps) {
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Gauge;
    return IconComponent;
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0" data-testid="sidebar">
      <nav className="p-4 space-y-2">
        {items.map((item) => {
          const IconComponent = getIcon(item.icon);
          
          return (
            <Button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              variant="ghost"
              className={cn(
                "w-full justify-start text-left px-4 py-3 h-auto font-medium transition-colors",
                item.active 
                  ? activeColor
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              data-testid={`sidebar-item-${item.id}`}
            >
              <IconComponent className="w-4 h-4 mr-3 flex-shrink-0" />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
