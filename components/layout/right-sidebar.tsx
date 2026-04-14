'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X } from 'lucide-react'
import { setRightSidebarOpen } from '@/lib/slices/uiSlice'

export default function RightSidebar() {
  const dispatch = useAppDispatch()
  const selectedTaskId = useAppSelector((state) => state.ui.selectedTaskId)
  const rightSidebarTab = useAppSelector((state) => state.ui.rightSidebarTab)

  return (
    <div className="w-[320px] border-l bg-background h-full flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold">
          {selectedTaskId ? 'Task Details' : 'Board Settings'}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(setRightSidebarOpen(false))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {selectedTaskId ? (
          <Tabs defaultValue={rightSidebarTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-0">
              <TabsTrigger
                value="overview"
                className="text-xs rounded-none"
                onClick={() =>
                  dispatch({ type: 'ui/setRightSidebarTab', payload: 'overview' })
                }
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="text-xs rounded-none"
                onClick={() =>
                  dispatch({ type: 'ui/setRightSidebarTab', payload: 'comments' })
                }
              >
                Comments
              </TabsTrigger>
              <TabsTrigger
                value="dependencies"
                className="text-xs rounded-none"
                onClick={() =>
                  dispatch({
                    type: 'ui/setRightSidebarTab',
                    payload: 'dependencies',
                  })
                }
              >
                Deps
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-xs rounded-none"
                onClick={() =>
                  dispatch({ type: 'ui/setRightSidebarTab', payload: 'activity' })
                }
              >
                Activity
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Task details will appear here when you select a task.
                </p>
                {/* TODO: Implement task detail form */}
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Comments section coming soon.
                </p>
              </TabsContent>

              <TabsContent value="dependencies" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Dependencies section coming soon.
                </p>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <p className="text-sm text-muted-foreground">
                  Activity log coming soon.
                </p>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Board settings will appear here.
            </p>
            {/* TODO: Implement board settings */}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
