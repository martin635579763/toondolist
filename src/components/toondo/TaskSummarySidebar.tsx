
"use client";

import type { Task } from '@/types/task';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ListChecks, CheckCircle2, CircleDotIcon, LibraryBig, IndentIcon, FileTextIcon } from 'lucide-react';

interface TaskSummarySidebarProps {
  tasks: Task[];
}

export function TaskSummarySidebar({ tasks }: TaskSummarySidebarProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const mainTasksCount = tasks.filter(t => !t.parentId).length;
  const subTasksCount = tasks.filter(t => !!t.parentId).length;

  return (
    <>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
            <FileTextIcon className="h-6 w-6 text-sidebar-primary" />
            <h2 className="text-lg font-semibold text-sidebar-primary">Task Summary</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarGroup>
            <SidebarMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent rounded-md">
              <div className="flex items-center justify-between w-full p-2 text-sm">
                <div className="flex items-center text-sidebar-foreground">
                  <ListChecks className="mr-3 h-5 w-5" />
                  <span>Total Tasks</span>
                </div>
                <span className="font-medium text-sidebar-foreground">{totalTasks}</span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent rounded-md">
               <div className="flex items-center justify-between w-full p-2 text-sm">
                <div className="flex items-center text-sidebar-foreground">
                  <CheckCircle2 className="mr-3 h-5 w-5 text-green-500" />
                  <span>Completed</span>
                </div>
                <span className="font-medium text-sidebar-foreground">{completedTasks}</span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent rounded-md">
              <div className="flex items-center justify-between w-full p-2 text-sm">
                 <div className="flex items-center text-sidebar-foreground">
                  <CircleDotIcon className="mr-3 h-5 w-5 text-yellow-500" /> {/* Changed to CircleDotIcon */}
                  <span>Pending</span>
                </div>
                <span className="font-medium text-sidebar-foreground">{pendingTasks}</span>
              </div>
            </SidebarMenuItem>
          </SidebarGroup>
          
          <SidebarSeparator className="my-3" />
          
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs text-sidebar-muted-foreground">Breakdown</SidebarGroupLabel>
            <SidebarMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent rounded-md">
              <div className="flex items-center justify-between w-full p-2 text-sm">
                <div className="flex items-center text-sidebar-foreground">
                    <LibraryBig className="mr-3 h-5 w-5" />
                    <span>Main Tasks</span>
                </div>
                <span className="font-medium text-sidebar-foreground">{mainTasksCount}</span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="hover:bg-sidebar-accent focus:bg-sidebar-accent rounded-md">
              <div className="flex items-center justify-between w-full p-2 text-sm">
                <div className="flex items-center text-sidebar-foreground">
                  <IndentIcon className="mr-3 h-5 w-5" />
                  <span>Sub-Tasks</span>
                </div>
                <span className="font-medium text-sidebar-foreground">{subTasksCount}</span>
              </div>
            </SidebarMenuItem>
          </SidebarGroup>
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
