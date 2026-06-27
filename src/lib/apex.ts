// ===========================
// 1. Data Transfer Objects (DTOs) & Interfaces
// ===========================

export type ScopeType = 'root' | 'tenant' | 'sandbox';

export interface Scope {
    type: ScopeType;
    id: string;
}

export interface User {
    id: string;
    email: string;
    role: string;
    scope: string;
    metadata?: Record<string, any>;
    last_active?: string;
    [key: string]: any;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface BaseRecord {
    id: string;
    created: string;
    updated: string;
    [key: string]: any;
}

export interface ListResult<T> {
    items: T[];
    total: number;
    page?: number;
    per_page?: number;
}

export interface QueryOptions {
    page?: number;
    per_page?: number;
    sort?: string;
    filter?: string | Record<string, any>;
    expand?: string;
    fields?: string;
    [key: string]: any;
}

export interface SchemaField {
    name: string;
    type: string;
    required: boolean;
    unique?: boolean;
    options?: string[];
    [key: string]: any;
}

export interface Collection {
    id: string;
    name: string;
    type: string;
    schema: {
        fields: Record<string, SchemaField>;
        relations?: Record<string, any>;
        policies?: {
            read: string;
            create: string;
            update: string;
            delete: string;
        };
    };
    created: string;
    updated: string;
}

export interface StoredFile {
    id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
    created_at: string;
}

export interface InstantResult {
    id: number;
    score: number;
    snippet: Record<string, any>;
}

export interface Script {
    id: string;
    name: string;
    trigger_type: string;
    code: string;
    active: boolean;
    target_collection?: string;
}

export interface Template {
    id: string;
    slug: string;
    content: string;
    script_id?: string;
}

export interface AiAction {
    id: string;
    slug: string;
    name: string;
    model: string;
    system_prompt?: string;
    template: string;
    config?: any;
}

export interface AiSession {
    id: string;
    name: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    current_manifest?: any;
    diff_summary?: string;
    last_error?: string;
    created_at: string;
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    description?: string;
    manifest: any;
    created_at: string;
}

export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    role: string;
    scope: string;
    bypass_cors: boolean;
    created_at: string;
}

export interface SystemLog {
    id: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    source: string;
    timestamp: string;
    meta?: any;
}

export interface SiteFile {
    path: string;
    size: number;
}

// ===========================
// 2. Custom Error Class
// ===========================

export class ApexError extends Error {
    status: number;
    code?: string | undefined;
    details?: any;

    constructor(message: string, status: number = 500, code?: string, details?: any) {
        super(message);
        this.name = 'ApexError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// ===========================
// 3. Main SDK Client
// ===========================

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: any | FormData;
    params?: Record<string, any>;
    isRoot?: boolean;
}

export class ApexKit {
    public baseUrl: string;
    private token: string | null = null;
    private currentUser: User | null = null;
    private scopeType: ScopeType;
    private scopeId: string;

    constructor(baseUrl: string, scopeType: ScopeType = 'root', scopeId: string = '') {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.scopeType = scopeType;
        this.scopeId = scopeId;
    }

    get scope(): Scope {
        return { type: this.scopeType, id: this.scopeId };
    }

    sandbox(uuid: string): ApexKit {
        const sandboxUrl = `${this.baseUrl}/sandbox/${uuid}`;
        const instance = new ApexKit(sandboxUrl, 'sandbox', uuid);
        instance.setToken(this.token || '', this.currentUser || undefined);
        return instance;
    }

    tenant(tenantId: string): ApexKit {
        const tenantUrl = `${this.baseUrl}/tenant/${tenantId}`;
        const instance = new ApexKit(tenantUrl, 'tenant', tenantId);
        instance.setToken(this.token || '', this.currentUser || undefined);
        return instance;
    }

    setToken(token: string, user?: User) {
        this.token = token;
        if (user) {
            this.currentUser = user;
            if (user.scope) {
                this.setScopeFromTag(user.scope);
            }
        }
    }

    private setScopeFromTag(tag: string) {
        if (tag === 'root') {
            this.scopeType = 'root';
            this.scopeId = '';
        } else if (tag.startsWith('tenant:')) {
            this.scopeType = 'tenant';
            this.scopeId = tag.split(':')[1] || '';
        } else if (tag.startsWith('sandbox:')) {
            this.scopeType = 'sandbox';
            this.scopeId = tag.split(':')[1] || '';
        }
    }

    getToken(): string | null {
        return this.token;
    }

    getUser(): User | null {
        return this.currentUser;
    }

    private async _request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        let path = endpoint;

        if (!options.isRoot && !endpoint.startsWith('/api/v1')) {
            path = endpoint.startsWith('/') ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`;
        }

        const url = new URL(`${this.baseUrl}${path}`);

        if (options.params) {
            Object.keys(options.params).forEach(key => {
                let value = options.params![key];
                if (value !== undefined && value !== null) {
                    if (typeof value === 'object' && key === 'filter') {
                        value = JSON.stringify(value);
                    }
                    url.searchParams.append(key, String(value));
                }
            });
        }

        const headers: Record<string, string> = { ...options.headers };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config: RequestInit = {
            method: options.method || 'GET',
            headers,
        };

        if (options.body) {
            if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
                config.body = options.body;
            } else {
                headers['Content-Type'] = 'application/json';
                config.body = JSON.stringify(options.body);
            }
        }

        try {
            const response = await fetch(url.toString(), config);

            if (response.status === 204) {
                return null as T;
            }

            const contentType = response.headers.get("content-type");
            if (contentType && (contentType.includes("text/plain") || contentType.includes("text/html"))) {
                const text = await response.text();
                if (!response.ok) throw new ApexError(text || 'API Error', response.status);
                return text as unknown as T;
            }

            const data = await response.json();

            if (options.isRoot && data.errors) {
                const error = new ApexError(data.errors[0].message || 'GraphQL Error', 400, 'graphql_error', data.errors);
                throw error;
            }

            if (!response.ok) {
                throw new ApexError(data.message || 'API Error', response.status, data.error, data.details);
            }

            return data as T;
        } catch (err) {
            throw err;
        }
    }

    get auth() {
        return {
            listRoles: () => this._request<{ roles: string[] }>('/auth/roles', { method: 'GET' }),
            login: async (email: string, password: string): Promise<AuthResponse> => {
                const res = await this._request<AuthResponse>('/auth/login', {
                    method: 'POST',
                    body: { email, password }
                });
                this.token = res.token;
                this.currentUser = res.user;
                if (res.user.scope) this.setScopeFromTag(res.user.scope);
                return res;
            },
            register: async (email: string, password: string): Promise<AuthResponse> => {
                const res = await this._request<AuthResponse>('/auth/register', {
                    method: 'POST',
                    body: { email, password }
                });
                this.token = res.token;
                this.currentUser = res.user;
                return res;
            },
            getMe: async (): Promise<User> => {
                const user = await this._request<User>('/auth/me');
                if (user.scope) this.setScopeFromTag(user.scope);
                return user;
            },
            logout: () => {
                this.token = null;
                this.currentUser = null;
            },
            loginWithGithub: (redirectTo?: string) => {
                let path = '/auth/github';
                if (!path.startsWith('/api/v1')) {
                    path = `/api/v1${path}`;
                }
                const url = new URL(`${this.baseUrl}${path}`);
                if (redirectTo) {
                    url.searchParams.append('redirect_to', redirectTo);
                }
                window.location.href = url.toString();
            },
            loginWithGoogle: (redirectTo?: string) => {
                let path = '/auth/google';
                if (!path.startsWith('/api/v1')) path = `/api/v1${path}`;
                const url = new URL(`${this.baseUrl}${path}`);
                if (redirectTo) url.searchParams.append('redirect_to', redirectTo);
                window.location.href = url.toString();
            },
        };
    }
}

export class ApexKitRealtimeWSClient {
    private url: string;
    private token: string | null;
    private socket: WebSocket | null = null;
    private reconnectInterval: number = 3000;
    private listeners: Array<(msg: any) => void> = [];
    public isConnected: boolean = false;
    private currentFilter: SubscriptionFilter | null = null;
    private pendingRequests = new Map<string, { resolve: (val: any) => void, reject: (err: Error) => void, timeout: any }>();

    constructor(url: string, token: string | null) {
        this.url = url.replace("http", "ws") + "/ws";
        this.token = token;
    }

    connect() {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            console.log("[ApexKit] Realtime Connected");
            this.isConnected = true;
            if (this.currentFilter) {
                this.subscribe(this.currentFilter);
            }
        };

        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.request_id) {
                    this._handleRequestResponse(msg);
                    return;
                }
                this.notify(msg);
            } catch (e) {
                if (event.data === "Pong") return;
                console.error("WS Parse Error", e);
            }
        };

        this.socket.onclose = () => {
            this.isConnected = false;
            this.pendingRequests.forEach(req => req.reject(new Error("Socket closed")));
            this.pendingRequests.clear();
            console.log("[ApexKit] Disconnected. Retrying...");
            setTimeout(() => this.connect(), this.reconnectInterval);
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.isConnected = false;
        }
    }

    subscribe(filter: SubscriptionFilter) {
        this.currentFilter = filter;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "Subscribe",
                payload: {
                    collection_id: filter.collectionId,
                    record_id: filter.recordId,
                    event_type: filter.eventType,
                    filter: filter.dataFilter,
                    channel: filter.channel,
                    custom_event: filter.customEvent
                }
            }));
        }
    }

    sendSignal(channel: string, eventName: string, data: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "Signal",
                payload: { channel, event: eventName, data }
            }));
        }
    }

    search(collectionId: number | string, query: string, limit: number = 10): Promise<InstantResult[]> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.socket) return reject(new Error("Socket not connected"));

            const requestId = crypto.randomUUID();
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Search request timed out"));
                }
            }, 5000);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            this.socket.send(JSON.stringify({
                type: "Search",
                payload: {
                    collection_id: Number(collectionId),
                    query,
                    limit,
                    request_id: requestId
                }
            }));
        });
    }

    onEvent(callback: (msg: any) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify(msg: any) {
        this.listeners.forEach(cb => cb(msg));
    }

    private _handleRequestResponse(msg: any) {
        const req = this.pendingRequests.get(msg.request_id);
        if (req) {
            clearTimeout(req.timeout);
            this.pendingRequests.delete(msg.request_id);
            if (msg.type === "Error") req.reject(new Error(msg.message));
            else req.resolve(msg.results);
        }
    }
}

export class ApexKitRealtimeSSEClient {
    private baseUrl: string;
    private source: EventSource | null = null;
    private listeners: Array<(msg: any) => void> = [];

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
    }

    connect({ channel, eventName }: { channel?: string, eventName?: string } = {}) {
        if (this.source) this.source.close();

        const params = new URLSearchParams();
        if (channel) params.append("channel", channel);
        if (eventName) params.append("event", eventName);

        this.source = new EventSource(`${this.baseUrl}/sse?${params.toString()}`, { withCredentials: true });

        this.source.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.notify(msg);
            } catch (e) {
                console.error("[ApexKit] SSE Parse Error", e);
            }
        };
    }

    disconnect() {
        if (this.source) {
            this.source.close();
            this.source = null;
        }
    }

    onEvent(callback: (msg: any) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify(msg: any) {
        this.listeners.forEach(cb => cb(msg));
    }
}
