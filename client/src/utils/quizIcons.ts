import type { LucideIcon } from 'lucide-react';
import {
    Award,
    BookOpen,
    Brain,
    Code2,
    FlaskConical,
    Lightbulb,
    Monitor,
    Rocket,
    Target,
    Trophy,
    Wrench,
    Zap
} from 'lucide-react';

export type QuizIconKey =
    | 'Code2'
    | 'BookOpen'
    | 'Brain'
    | 'Target'
    | 'Trophy'
    | 'Lightbulb'
    | 'Award'
    | 'Rocket'
    | 'Monitor'
    | 'FlaskConical'
    | 'Zap'
    | 'Wrench';

export interface QuizIconOption {
    key: QuizIconKey;
    label: string;
    Icon: LucideIcon;
}

export const QUIZ_ICON_OPTIONS: QuizIconOption[] = [
    { key: 'Code2', label: 'Code', Icon: Code2 },
    { key: 'BookOpen', label: 'Study', Icon: BookOpen },
    { key: 'Brain', label: 'Brain', Icon: Brain },
    { key: 'Target', label: 'Target', Icon: Target },
    { key: 'Trophy', label: 'Trophy', Icon: Trophy },
    { key: 'Lightbulb', label: 'Idea', Icon: Lightbulb },
    { key: 'Award', label: 'Award', Icon: Award },
    { key: 'Rocket', label: 'Launch', Icon: Rocket },
    { key: 'Monitor', label: 'Screen', Icon: Monitor },
    { key: 'FlaskConical', label: 'Science', Icon: FlaskConical },
    { key: 'Zap', label: 'Fast', Icon: Zap },
    { key: 'Wrench', label: 'Tools', Icon: Wrench },
];

export const DEFAULT_QUIZ_ICON: QuizIconKey = 'Code2';

export const getQuizIconOption = (iconKey?: string | null): QuizIconOption => {
    const fallback = QUIZ_ICON_OPTIONS[0];
    if (!iconKey) return fallback;
    return QUIZ_ICON_OPTIONS.find(option => option.key === iconKey) || fallback;
};
