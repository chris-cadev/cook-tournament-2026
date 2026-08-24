export declare function sendEmail(to: string, subject: string, html: string): Promise<boolean>;
export declare function sendTeamConfirmation(to: string, teamName: string, eventName: string): Promise<boolean>;
export declare function sendScoreReveal(to: string, eventName: string, category: string): Promise<boolean>;
