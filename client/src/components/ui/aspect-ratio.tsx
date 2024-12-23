import { Root, RootProps } from '@radix-ui/react-aspect-ratio';

import { FC, ReactElement } from 'react';

// Correctly define a type for the AspectRatio component
const AspectRatioComponent: FC<RootProps> = (props): ReactElement => <Root {...props} />;

// Export the component with a more descriptive name
export { AspectRatioComponent };
