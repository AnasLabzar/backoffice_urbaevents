"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBriefcase,
  IconListCheck,
  IconChartBar, // Zidna Analytics
  IconRecycle,  // Zidna Lifecycle
} from "@tabler/icons-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Hado homa l-links l-assassin
const links = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Lifecycle",
    url: "/dashboard/lifecycle",
    icon: IconRecycle,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: IconChartBar,
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: IconBriefcase,
  },
  {
    title: "Team",
    url: "/dashboard/teams",
    icon: IconUsers,
  },
  // --- HADA HOWA L-LINK L-JDID ---
  {
    title: "Tâches",
    url: "/dashboard/tasks",
    icon: IconListCheck,
  },
  // ----------------------------------
];

export function NavMain() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {/* ... (Hna nqdro nkhliw l-Quick Create dyalk ila bghiti) ... */}
        </SidebarMenu>
        <SidebarMenu>
          {links.map((item) => (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
                <SidebarMenuButton
                  tooltip={item.title}
                  // Hna l-logic dyal l-link l-active
                  className={cn(
                    pathname === item.url && "bg-accent text-accent-foreground"
                  )}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
