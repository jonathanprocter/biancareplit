import React, { useMemo } from 'react';
import { formatDate, getRelativeTime } from '../lib/utils';
import type { DateDisplayProps } from '../types/dates';

export const DateDisplay: React.FC<DateDisplayProps> = ({
    date,
    options = {},
    className = '',
    fallback = 'Invalid date',
    showRelative = false
}) => {
    const formattedDate = useMemo(() => formatDate(date, options), [date, options]);
    const relativeTime = useMemo(() => showRelative ? getRelativeTime(date) : null, [date, showRelative]);
    const isInvalid = formattedDate === 'Invalid date';

    return (
        <span 
            className={className}
            data-testid="date-display"
            title={!isInvalid ? formattedDate : undefined}
        >
            {isInvalid ? fallback : (showRelative ? relativeTime : formattedDate)}
        </span>
    );
};

DateDisplay.displayName = 'DateDisplay';
