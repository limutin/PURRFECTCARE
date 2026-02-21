export const projectId = "qwdekvgushzvbyjowvmg"
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3ZGVrdmd1c2h6dmJ5am93dm1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODkzNjAsImV4cCI6MjA4NjQ2NTM2MH0.nPPjXxUpjFADXv_64Ip8H7rd1S-I48pumzFbVmIN98s"
export const functionName = "make-server-b53d76e4"
export const supabaseUrl = `https://${projectId}.supabase.co`
export const getFunctionUrl = (path: string) => `${supabaseUrl}/functions/v1/${functionName}${path}`

export const supabaseFetch = (path: string, options: RequestInit = {}, accessToken?: string) => {
    const headers = new Headers(options.headers);
    headers.set('apikey', publicAnonKey);
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(getFunctionUrl(path), {
        ...options,
        headers
    });
};
