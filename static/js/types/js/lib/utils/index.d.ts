import { type ClassValue } from 'clsx';
export declare function cn(...inputs: ClassValue[]): string;
export declare function formatDateTime(input: string | number | Date): string;
export declare function isValidDate(date: Date): boolean;
export { formatDateTime as formatDate };
