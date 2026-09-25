// Small inline icon set (24px grid, 1.75 stroke), so the app ships no icon font.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export const HashIcon = (p: IconProps) => (
    <Icon {...p}><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></Icon>
);
export const PlusIcon = (p: IconProps) => (
    <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const LinkIcon = (p: IconProps) => (
    <Icon {...p}><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43" /><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33" /></Icon>
);
export const CopyIcon = (p: IconProps) => (
    <Icon {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Icon>
);
export const CheckIcon = (p: IconProps) => (
    <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>
);
export const SparklesIcon = (p: IconProps) => (
    <Icon {...p}><path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.9L12 18.5l-1.8-5.8L4.5 10.8 10.2 9 12 3.5Z" /><path d="M19 3v3M20.5 4.5h-3" /></Icon>
);
export const CodeIcon = (p: IconProps) => (
    <Icon {...p}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></Icon>
);
export const SendIcon = (p: IconProps) => (
    <Icon {...p}><path d="M5 12h13M13 6l6 6-6 6" /></Icon>
);
export const LogOutIcon = (p: IconProps) => (
    <Icon {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></Icon>
);
export const MenuIcon = (p: IconProps) => (
    <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
);
export const XIcon = (p: IconProps) => (
    <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
export const ArrowRightIcon = (p: IconProps) => (
    <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
export const KeyIcon = (p: IconProps) => (
    <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.7-8.7M16 7l3 3M14 9l2 2" /></Icon>
);
export const LockIcon = (p: IconProps) => (
    <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
);
export const ZapIcon = (p: IconProps) => (
    <Icon {...p}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" /></Icon>
);
export const DatabaseIcon = (p: IconProps) => (
    <Icon {...p}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" /></Icon>
);
export const RefreshIcon = (p: IconProps) => (
    <Icon {...p}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" /></Icon>
);

export const GitHubIcon = ({ size = 16, ...p }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
        <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.73-1.54-2.56-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
);
