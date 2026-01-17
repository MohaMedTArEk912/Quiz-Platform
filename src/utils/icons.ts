import * as LucideIcons from 'lucide-react';
import { BookOpen, type LucideIcon } from 'lucide-react';

export const getIcon = (name: string): LucideIcon => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (LucideIcons as any)[name] || BookOpen;
};
