"use client";

import * as React from "react";
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  type Icon, // Import the Icon type
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

// Define proper types for the navigation items
interface NavItem {
  title: string;
  url: string;
  icon: Icon; // Use Icon type for consistency
  items?: NavSubItem[];
}

interface NavSubItem {
  title: string;
  url: string;
}

interface NavDocumentsItem {
  name: string;
  url: string;
  icon: Icon; // Use Icon type to match NavDocuments expectations
}

interface AppSidebarData {
  navMain: NavItem[];
  navClouds: NavItem[];
  navSecondary: NavItem[];
  documents: NavDocumentsItem[];
}

const data: AppSidebarData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Lifecycle",
      url: "/dashboard/lifecycle",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "/dashboard/projects",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "/dashboard/teams",
      icon: IconUsers,
    },
    {
      title: "Tâches",
      url: "/dashboard/tasks",
      icon: IconListDetails,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      url: "/dashboard/capture",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/capture/active",
        },
        {
          title: "Archived",
          url: "/dashboard/capture/archived",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "/dashboard/proposal",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/proposal/active",
        },
        {
          title: "Archived",
          url: "/dashboard/proposal/archived",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "/dashboard/prompts",
      items: [
        {
          title: "Active Proposals",
          url: "/dashboard/prompts/active",
        },
        {
          title: "Archived",
          url: "/dashboard/prompts/archived",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "/dashboard/search",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/dashboard/data-library",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "/dashboard/word-assistant",
      icon: IconFileWord,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: meData, loading, error } = useQuery(ME_QUERY);
  const user = meData?.me;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard" className="h-9">
                <span className="text-base font-semibold pl-3">
                  <img
                    src="/logo/logo-black-urba-events.png"
                    alt="Urba Events DASHBOARD"
                    className="h-9 dark:hidden"
                  />
                </span>
                <span className="text-base font-semibold">
                  <img
                    src="/logo/logo-white-urba-events.png"
                    alt="Urba Events DASHBOARD"
                    className="h-9 hidden dark:block"
                  />
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  );
}