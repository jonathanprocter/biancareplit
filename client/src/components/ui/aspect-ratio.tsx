import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

// Correctly define a type for the AspectRatio component
const AspectRatio: React.FC<AspectRatioPrimitive.RootProps> = (props) => (
  <AspectRatioPrimitive.Root {...props} />
);

// Export the component with a more descriptive name
export { AspectRatio as AspectRatioComponent };
