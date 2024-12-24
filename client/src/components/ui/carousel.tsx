import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';

import * as React from 'react';

import { cn } from '@/lib/utils';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

interface CarouselProps {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children?: React.ReactNode;
}

export function Carousel({
  opts,
  plugins,
  orientation = 'horizontal',
  className,
  children,
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins,
  );

  return (
    <div ref={emblaRef} className={cn('overflow-hidden', className)} dir="ltr">
      <div className="flex">{children}</div>
    </div>
  );
}

export { type CarouselApi };
