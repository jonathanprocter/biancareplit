```typescript
import { cn } from '@/lib/utils';
import React from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton: React.FC<Props> = ({ className, ...props }) => {
  return <div className={cn('animate-pulse rounded-md bg-muted', className ?? '')} {...props} />;
}

export default Skeleton;
```