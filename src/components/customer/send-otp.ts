export interface OtpAttempt {
    exceeded: boolean;
    attemptTime: any;
    otp: number;
    message: string;
}
