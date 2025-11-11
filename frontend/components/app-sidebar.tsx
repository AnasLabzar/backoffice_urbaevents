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
  IconInnerShadowTop, // This is no longer used, but we'll leave the import
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
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
// 2. Imports jdad l-API
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react"; // St3mlna ".../react" b7al l-login

// 3. N-definiw L-Query dyal "me"
const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

// Your data object (no changes)
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
};


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {  // 5. Nst3mlo L-Hook dyal useQuery bach njibdo l-user
  const { data: meData, loading, error } = useQuery(ME_QUERY);

  // Njbdo l-user mn l-data
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
              <a href="#" className="h-9">
                {/* --- START: THEME LOGO CHANGE --- */}

                {/* 1. Light Mode Logo (Dark text) */}
                {/* This logo appears by default and hides in dark mode */}
                <span className="text-base font-semibold pl-3">
                  <img
                    src="/logo/logo-black-urba-events.png" // <-- IMPORTANT: Add path to your DARK-TEXT logo
                    alt="Urba Events DASHBOARD"
                    className="h-9 dark:hidden" // Hides when dark mode is active
                  />
                </span>

                {/* 2. Dark Mode Logo (White text) */}
                {/* This logo is hidden by default and appears in dark mode */}
                <span className="text-base font-semibold">
                  <img
                    src="/logo/logo-white-urba-events.png" // This is your existing WHITE-TEXT logo
                    alt="Urba Events DASHBOARD"
                    className="h-9 hidden dark:block" // Hides by default, shows when dark mode is active
                  />
                </span>

                {/* --- END: THEME LOGO CHANGE --- */}
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
        {/* 6. Ghadi nssifto "user" w "loading" l-NavUser */}
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  );
}