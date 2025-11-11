"use client";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
// We will get the 'columns' from the data-table file
import { columns } from "@/components/data-table";

// Your old imports
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

// HADA HOWA L-QUERY L-S7I7
const GET_PROJECTS_FEED = gql`
  query GetProjectsFeed {
    projects_feed {
      project {
        id
        title
        object
        status: generalStatus
        preparationStatus
        projectManagers { id name }
        stages { 
          administrative { documents { id fileName fileUrl } } # <-- S777NAHA
          technical { documents { id fileName fileUrl } } # <-- S777NAHA
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
  // 2. Fetch the data
  const { data, loading, error } = useQuery(GET_PROJECTS_FEED);

  // 3. Prepare data for the table
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
              <div className="px-4 lg:px-6 h-96"> {/* <-- ZID HNA CHI HEIGHT */}
                <ChartAreaInteractive />
              </div>

              {/* --- 4. This is the main change --- */}
              {loading ? (
                // Show loading skeletons
                <div className="px-4 lg:px-6 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                // Show error message
                <div className="px-4 lg:px-6">
                  <p className="text-red-500">Error: {error.message}</p>
                </div>
              ) : (
                // Show the data table
                <DataTable columns={columns} data={tableData} />
              )}
              {/* ------------------------- */}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}