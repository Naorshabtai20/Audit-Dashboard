/// <reference types="vite/client" />

// Provide ImportMeta.env types for TypeScript when vite/client types are not picked up
interface ImportMetaEnv
{
    readonly MODE: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    // Add any other env vars used in the app here, optional
    readonly VITE_API_URL?: string;
    readonly [key: string]: any;
}

interface ImportMeta
{
    readonly env: ImportMetaEnv;
}
