"use client";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { columns } from "@/components/data-table";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// QUERY UPDATED: Removed 'createdAt' to fix 400 Error
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        # createdAt field removed to prevent 400 Bad Request
        projectManagers { id name }
        stages { 
          administrative { documents { id fileName fileUrl } } 
          technical { documents { id fileName fileUrl } } 
        }
        submissionDeadline
        cautionRequestDate
        feasibilityChecks {
          administrative
          technical
          financial
        }
        caution {
          status
        }
        team {
          infographistes { id name }
          team3D { id name }
          assistants { id name }
        }
      }
      latestTask { id description status createdAt }
    }
  }
`;

export default function Page() {
  const { data, loading, error } = useQuery(GET_PROJECTS_FEED);
  const tableData = data?.projects_feed || [];

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              {/* CHART CONTAINER */}
              <div className="px-4 mb-20 lg:px-6 h-96"> 
                 {loading ? (
                    <Skeleton className="h-full w-full rounded-xl" />
                 ) : (
                    <ChartAreaInteractive projects={tableData} />
                 )}
              </div>

              {/* TABLE CONTAINER */}
              {loading ? (
                <div className="px-4 lg:px-6 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                <div className="mt-4 px-4 lg:px-6">
                  <p className="text-red-500">Error: {error.message}</p>
                </div>
              ) : (
                <DataTable columns={columns} data={tableData} />
              )}

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}