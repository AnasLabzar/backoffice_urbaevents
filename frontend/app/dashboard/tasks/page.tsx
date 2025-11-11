"use client";

import * as React from "react"; // <-- Add this
import { TasksTable, getTaskColumns, type Task } from "./tasks-table";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { Skeleton } from "@/components/ui/skeleton";
import { gql, useQuery } from "@apollo/client";

// HADA HOWA L-QUERY L-S7I7 DYAL L-TASKS
const GET_MY_TASKS_QUERY = gql`
  query GetMyTasks {
    myTasks {
      id
      description
      status
      department
      dueDate
      createdAt
      assignedTo {
        id
        name
        email
      }
      project {
        id
        object
        title
      }
      v1Uploads {
        id
        fileName
        fileUrl
        originalFileName
        uploadedBy {
          id
          name
        }
      }
      finalUpload {
        id
        fileName
        fileUrl
        originalFileName
        uploadedBy {
          id
          name
        }
      }
    }
  }
`;

// DEBUG QUERY - Check user info and permissions
const GET_ME_DEBUG = gql`
  query GetMeDebug {
    me {
      id
      name
      email
      role {
        name
        permissions
      }
    }
  }
`;

// DEBUG QUERY - Get all tasks to see what exists
const GET_ALL_TASKS_DEBUG = gql`
  query GetAllTasksDebug {
    tasksByProject(projectId: "690a4d3e103c852a7950dfc3") {
      id
      description
      status
      assignedTo {
        id
        name
      }
      project {
        id
        title
      }
    }
  }
`;

export default function TasksPage() {
  const { data: tasksData, loading: tasksLoading, error: tasksError } = useQuery(GET_MY_TASKS_QUERY);
  const { data: meData, loading: meLoading } = useQuery(GET_ME_DEBUG);
  const { data: allTasksData, loading: allTasksLoading } = useQuery(GET_ALL_TASKS_DEBUG);

  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);


  // L-KHELL L-JDID:
  const columns = getTaskColumns(setSelectedTask, setIsDrawerOpen);


  console.log("🔍 DEBUG INFO:");
  console.log("Current User:", meData?.me);
  console.log("My Tasks:", tasksData?.myTasks);
  console.log("All Tasks in Project:", allTasksData?.tasksByProject);

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
              <div className="px-4 lg:px-6 h-96">
                <ChartAreaInteractive />
              </div>

              {/* Debug Info - Remove after debugging */}
              <div className="px-4 lg:px-6">
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <h3 className="font-bold text-yellow-800">Debug Information:</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p><strong>Current User:</strong> {meData?.me?.name} (ID: {meData?.me?.id})</p>
                    <p><strong>User Role:</strong> {meData?.me?.role?.name}</p>
                    <p><strong>Permissions:</strong> {meData?.me?.role?.permissions?.join(', ')}</p>
                    <p><strong>My Tasks Count:</strong> {tasksData?.myTasks?.length || 0}</p>
                    <p><strong>All Tasks Count:</strong> {allTasksData?.tasksByProject?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Page Header */}
              <div className="px-4 lg:px-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold">Gestion des Tâches</h1>
                  <p className="text-muted-foreground">
                    Visualisez et gérez vos tâches assignées
                  </p>
                </div>
              </div>

              <div className="px-4 lg:px-6 h-96">

                {tasksLoading ? (
                  <div className="px-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : tasksError ? (
                  <div className="px-4 lg:px-6 h-96">
                    <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                      <p className="text-red-700 font-medium">Error Fetching Tasks:</p>
                      <p className="text-red-600 text-sm mt-1">{tasksError.message}</p>
                    </div>
                  </div>
                ) : (
                  <TasksTable
                    columns={columns}
                    selectedTask={selectedTask}
                    setSelectedTask={setSelectedTask}
                    isDrawerOpen={isDrawerOpen}
                    setIsDrawerOpen={setIsDrawerOpen}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}