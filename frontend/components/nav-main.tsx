"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Icon } from "@tabler/icons-react"; // Import Icon type
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export interface NavItem {
  title: string;
  url: string;
  icon: Icon; // Use Icon type
  items?: NavSubItem[];
}

export interface NavSubItem {
  title: string;
  url: string;
}

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            // --- HNA L-MODIFICATION ---
            // 1. Checki wach 3ndo submenu
            item.items && item.items.length > 0 ? (
              // 2. ILA 3NDO: Khlli l-code l-qdim (Collapsible)
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={true} // Bghina l-menu ykon m7loul
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                    // 7eyyedna l-check dyal pathname mn hna
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link
                              href={subItem.url}
                              className={cn(
                                pathname === subItem.url && "bg-accent text-accent-foreground"
                              )}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              // 3. ILA MA 3NDOCH: Reddo <Link> 3adi
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild // <-- MOHIMMA: katkhlli l-button ywelli howa l-Link
                  tooltip={item.title}
                  className={cn(
                    pathname === item.url && "bg-accent text-accent-foreground"
                  )}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
            // --- FIN DYAL L-MODIFICATION ---
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}