import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

/**
 * AI Pentest — the "Terminal Shield" mark. A shield (assurance / security) housing a
 * `>` prompt + cursor (the penetration test itself). The neutral shield tracks
 * `currentColor` so it adapts to any surface/theme; the ember prompt is fixed
 * (#f57214) so the accent reads on both light and dark.
 */
const Logo = ({ className, ...props }: LogoProps) => {
    return (
        <svg
            className={cn(className)}
            fill="none"
            viewBox="0 0 40 40"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2.3"
            />
            <path
                d="M14.5 16 L19.5 20.5 L14.5 25"
                stroke="#f57214"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
            />
            <path
                d="M22 25 H27"
                stroke="#f57214"
                strokeLinecap="round"
                strokeWidth="2.5"
            />
        </svg>
    );
};

export default Logo;
