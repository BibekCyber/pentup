import { Bug, ClipboardList, FileText, Radar } from 'lucide-react';

import Logo from '@/components/icons/logo';

const SUGGESTIONS = [
    {
        icon: ClipboardList,
        prompt: 'Build me a test plan for the OWASP Top 10 against a REST API with JWT auth.',
        title: 'Plan a web app test',
    },
    {
        icon: Radar,
        prompt: 'Which nmap options give a thorough but low-noise service scan of a /24, and why?',
        title: 'Tune an nmap scan',
    },
    {
        icon: Bug,
        prompt: 'How do I verify whether an endpoint is vulnerable to IDOR, step by step?',
        title: 'Verify an IDOR',
    },
    {
        icon: FileText,
        prompt: 'Write a finding description, impact and remediation for reflected XSS in a search parameter.',
        title: 'Write up a finding',
    },
] as const;

interface ChatEmptyStateProps {
    onPick: (prompt: string) => void;
}

export const ChatEmptyState = ({ onPick }: ChatEmptyStateProps) => (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pt-[12vh] pb-8 text-center">
        <div className="bg-brand-tint border-border mb-5 flex size-12 items-center justify-center rounded-2xl border">
            <Logo className="size-7 drop-shadow-[0_0_10px_rgba(245,114,20,0.45)]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">What are you testing today?</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-[14px]">
            Ask about vulnerabilities, techniques, tools or report wording. Answers only; nothing is run against any
            target.
        </p>

        <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map(({ icon: Icon, prompt, title }) => (
                <button
                    className="border-border bg-card hover:border-primary/50 hover:bg-brand-tint group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors"
                    key={title}
                    onClick={() => onPick(prompt)}
                    type="button"
                >
                    <Icon className="text-muted-foreground group-hover:text-primary mt-0.5 size-4 shrink-0 transition-colors" />
                    <span className="min-w-0">
                        <span className="block text-[13px] font-semibold">{title}</span>
                        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-[12.5px]">{prompt}</span>
                    </span>
                </button>
            ))}
        </div>
    </div>
);
