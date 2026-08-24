import { Client } from 'minio';
export declare function getMinioClient(): Client | null;
export declare function isMinioAvailable(): boolean;
export declare function getBucket(): string;
export declare function getPublicUrl(objectName: string): string;
export declare function ensureBucket(): Promise<void>;
