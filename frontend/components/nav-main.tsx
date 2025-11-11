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
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.items ? true : undefined}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={cn(
                      pathname === item.url && "bg-accent text-accent-foreground"
                    )}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    {item.items && (
                      <ChevronRight className="ml-auto transition-transform duration-200" />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && (
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
                )}
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}