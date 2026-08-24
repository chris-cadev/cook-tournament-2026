<<<<<<< HEAD
export declare function sendReminderEmail(to: string, subject: string, html: string): Promise<boolean>;
=======
export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    enabled: boolean;
}
export declare function loadTemplates(): EmailTemplate[];
export declare function saveTemplates(templates: EmailTemplate[]): void;
export declare function sendEmail(to: string, subject: string, htmlBody: string): Promise<{
    ok: boolean;
    error?: string;
}>;
export declare function markdownToHtml(md: string): string;
>>>>>>> orchestrator/task-7-milestone-7-email-system
