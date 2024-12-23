import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

type PanelGroupProps = React.ComponentProps<typeof ResizablePrimitive.PanelGroup>;
type PanelResizeHandleProps = React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
};

const ResizablePanelGroup: React.FC<PanelGroupProps> = ({ className, ...props }) => (
  <ResizablePrimitive.PanelGroup className={`flex h-full w-full ${className}`} {...props} />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle: React.FC<PanelResizeHandleProps> = ({ withHandle, className, ...props }) => (
  <ResizablePrimitive.PanelResizeHandle
    className={`relative flex w-px items-center justify-center bg-border ${className}`}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
