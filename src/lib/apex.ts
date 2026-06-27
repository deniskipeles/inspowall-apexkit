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

export interface SandboxMetadata {
  id: string;
  name: string | null;
  status: string;
  expires_at: string | null;
  scope: string;
  tenant_id: string | null;
  current_storage_mb: number;
  max_storage_mb: number;
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
  // Common Identifier & Metadata
  id: string;
  name: string;
  created_at: string;

  // New Scoped & Composite Fields
  tenant_id: string;
  key_id: string;
  issuer: 'root' | 'tnt' | string;
  env_type: 'sys' | 'tnnt' | 'sk' | 'pk' | string;
  roles: string[];
  status: 'active' | 'revoked' | string;
  bypass_cors: boolean;

  // Legacy Compatibility Fields
  prefix?: string;
  role?: string;
  scope?: string;
  created?: string;
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
  code?: string | undefined; // <--- PATCHED: Added | undefined
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

/**
 * ApexKit Client SDK v0.1.0
 * A TypeScript client for the ApexKit API.
 * Compatible with modern Browsers and Node.js.
 */
export class ApexKit {
  public baseUrl: string;
  private token: string | null = null;
  private currentUser: User | null = null;
  private scopeType: ScopeType;
  private scopeId: string;

  /**
   * Initialize the ApexKit client.
   * @param baseUrl - The URL of your ApexKit API (e.g., 'http://127.0.0.1:5000').
   * @param scopeType - 'root', 'tenant', or 'sandbox'.
   * @param scopeId - The ID if tenant/sandbox.
   */
  constructor(baseUrl: string, scopeType: ScopeType = 'root', scopeId: string = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.scopeType = scopeType;
    this.scopeId = scopeId;
  }

  /**
   * Helper to check current scope context.
   */
  get scope(): Scope {
    return { type: this.scopeType, id: this.scopeId };
  }

  /**
   * Creates a new client instance pointed at a specific Sandbox session.
   * @param uuid - The Sandbox Session ID.
   */
  sandbox(uuid: string): ApexKit {
    const sandboxUrl = `${this.baseUrl}/sandbox/${uuid}`;
    const instance = new ApexKit(sandboxUrl, 'sandbox', uuid);
    instance.setToken(this.token || '', this.currentUser || undefined);
    return instance;
  }

  /**
   * Creates a new client instance pointed at a specific Tenant.
   * @param tenantId - The Tenant ID.
   */
  tenant(tenantId: string): ApexKit {
    const tenantUrl = `${this.baseUrl}/tenant/${tenantId}`;
    const instance = new ApexKit(tenantUrl, 'tenant', tenantId);
    instance.setToken(this.token || '', this.currentUser || undefined);
    return instance;
  }

  /**
   * Manually set the JWT token and sync scope from user object if provided.
   */
  setToken(token: string, user?: User) {
    this.token = token;
    if (user) {
      this.currentUser = user;
      if (user.scope) {
        this.setScopeFromTag(user.scope);
      }
    }
  }

  /**
   * Internal: Parse "tenant:123" into internal state.
   */
  private setScopeFromTag(tag: string) {
    if (tag === 'root') {
      this.scopeType = 'root';
      this.scopeId = '';
    } else if (tag.startsWith('tenant:')) {
      this.scopeType = 'tenant';
      this.scopeId = tag.split(':')[1] || ''; // <--- PATCHED: Added fallback
    } else if (tag.startsWith('sandbox:')) {
      this.scopeType = 'sandbox';
      this.scopeId = tag.split(':')[1] || ''; // <--- PATCHED: Added fallback
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.currentUser;
  }

  /**
   * Internal request handler using Fetch.
   */
  private async _request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    let path = endpoint;

    // Prefix with /api/v1 unless 'isRoot' is true
    if (!options.isRoot && !endpoint.startsWith('/api/v1')) {
      path = endpoint.startsWith('/') ? `/api/v1${endpoint}` : `/api/v1/${endpoint}`;
    }

    const url = new URL(`${this.baseUrl}${path}`);

    if (options.params) {
      Object.keys(options.params).forEach((key) => {
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

      const contentType = response.headers.get('content-type');
      if (
        contentType &&
        (contentType.includes('text/plain') || contentType.includes('text/html'))
      ) {
        const text = await response.text();
        if (!response.ok) throw new ApexError(text || 'API Error', response.status);
        return text as unknown as T;
      }

      const data = await response.json();

      // Handle GraphQL Errors
      if (options.isRoot && data.errors) {
        const error = new ApexError(
          data.errors[0].message || 'GraphQL Error',
          400,
          'graphql_error',
          data.errors
        );
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

  // ==========================================
  // Namespaces
  // ==========================================

  get auth() {
    return {
      listRoles: () => this._request<{ roles: string[] }>('/auth/roles', { method: 'GET' }),

      login: async (email: string, password: string): Promise<AuthResponse> => {
        const res = await this._request<AuthResponse>('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        this.token = res.token;
        this.currentUser = res.user;
        if (res.user.scope) this.setScopeFromTag(res.user.scope);
        return res;
      },

      register: async (email: string, password: string): Promise<AuthResponse> => {
        const res = await this._request<AuthResponse>('/auth/register', {
          method: 'POST',
          body: { email, password },
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
      // Google Auth Trigger
      loginWithGoogle: (redirectTo?: string) => {
        let path = '/auth/google';
        if (!path.startsWith('/api/v1')) path = `/api/v1${path}`;
        const url = new URL(`${this.baseUrl}${path}`);
        if (redirectTo) url.searchParams.append('redirect_to', redirectTo);
        window.location.href = url.toString();
      },

      requestPasswordReset: (email: string) =>
        this._request<{ success: boolean; message: string }>('/auth/request-password-reset', {
          method: 'POST',
          body: { email },
        }),

      confirmPasswordReset: (token: string, newPassword: string) =>
        this._request<{ success: boolean; message: string }>('/auth/confirm-password-reset', {
          method: 'POST',
          body: { token, new_password: newPassword },
        }),
    };
  }

  get admins() {
    return {
      // Collections
      listCollections: () => this._request<Collection[]>('/collections'),
      createCollection: (name: string, schema: any) =>
        this._request<Collection>('/collections', { method: 'POST', body: { name, schema } }),
      getCollection: (id: string | number) => this._request<Collection>(`/collections/${id}`),
      updateCollection: (id: string | number, payload: any) =>
        this._request<Collection>(`/collections/${id}`, { method: 'PUT', body: payload }),
      patchCollection: (id: string | number, payload: any) =>
        this._request<Collection>(`/collections/${id}`, { method: 'PATCH', body: payload }),
      deleteCollection: (id: string | number) =>
        this._request(`/collections/${id}`, { method: 'DELETE' }),

      // Config
      listConfigs: () => this._request<any[]>('/admin/config'),
      setConfig: (key: string, value: string, encrypt: boolean) =>
        this._request('/admin/config', { method: 'POST', body: { key, value, encrypt } }),
      deleteConfig: (key: string) =>
        this._request(`/admin/config/${encodeURIComponent(key)}`, { method: 'DELETE' }),

      // Users
      registerUser: (email: string, password?: string, role?: string, metadata?: any) =>
        this._request<AuthResponse>('/auth/register', {
          method: 'POST',
          body: { email, password, role, metadata },
        }),

      updateUser: (
        id: string | number,
        email?: string,
        password?: string,
        role?: string,
        metadata?: any
      ) =>
        this._request<User>(`/admin/users/${id}`, {
          method: 'PATCH',
          body: { email, password, role, metadata },
        }),

      listUsers: (options: QueryOptions = {}) =>
        this._request<ListResult<User>>(`/admin/users`, { method: 'GET', params: options }),
      deleteUser: (id: string | number) =>
        this._request(`/admin/users/${id}`, { method: 'DELETE' }),

      // Settings
      getSettings: () => this._request<any>('/admin/settings'),
      updateSettings: (settings: any) =>
        this._request<any>('/admin/settings', { method: 'PUT', body: settings }),
      patchSettings: (settings: any) =>
        this._request<any>('/admin/settings', { method: 'PATCH', body: settings }),

      // Storage Utils
      testS3StorageConnection: (config: any) =>
        this._request('/admin/storage/test', { method: 'POST', body: config }),
      migrateStorage: (source: string, destination: string) =>
        this._request<any>('/admin/storage/migrate', {
          method: 'POST',
          body: { source, destination },
        }),

      // Backups
      createBackup: () => this._request('/admin/backup', { method: 'POST' }),
      listBackups: () =>
        this._request<Array<{ name: string; size: number; created: string }>>('/admin/backups', {
          method: 'GET',
        }),
      restoreFromFile: (filename: string) =>
        this._request('/admin/restore-file', { method: 'POST', body: { filename } }),
      restoreBackup: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('/admin/restore', { method: 'POST', body: formData });
      },
      downloadBackup: async (filename: string): Promise<Blob> => {
        const url = `${this.baseUrl}/api/v1/admin/backups/${filename}`;
        const headers: Record<string, string> = {};
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      },

      // API Keys
      listApiKeys: () => this._request<ApiKey[]>('/admin/keys', { method: 'GET' }),
      createApiKey: (
        name: string,
        role = 'admin',
        scope = 'root',
        bypass_cors = true,
        env_type = 'sys',
        roles: string[] = ['admin'],
        target_tenant?: string
      ) =>
        this._request<{ key: string; info: ApiKey }>('/admin/keys', {
          method: 'POST',
          body: {
            name,
            role,
            scope,
            bypass_cors,
            env_type,
            roles,
            target_tenant,
          },
        }),
      updateApiKey: (id: string | number, updates: Partial<ApiKey>) =>
        this._request(`/admin/keys/${id}`, { method: 'PUT', body: updates }),
      deleteApiKey: (id: string | number) =>
        this._request(`/admin/keys/${id}`, { method: 'DELETE' }),

      // System
      reloadSystem: (target: string | null) =>
        this._request('/admin/system/reload', { method: 'POST', body: { target } }),
      testEmail: (email: string, templateType?: string) =>
        this._request('/admin/smtp/test', {
          method: 'POST',
          body: { email, template_type: templateType },
        }),
      reIndex: (collectionId?: string | number) =>
        this._request(`/admin/collections/${collectionId || ''}/reindex`, {
          method: 'POST',
          body: {},
        }),
      revectorizeCollection: (collectionId: string | number, force = false) =>
        this._request(`/admin/collections/${collectionId}/revectorize`, {
          method: 'POST',
          body: { force },
        }),

      // Import/Export
      importData: (collectionName: string, file: File) => {
        const formData = new FormData();
        formData.append('collection_name', collectionName);
        formData.append('file', file);
        return this._request('/admin/import-data', { method: 'POST', body: formData });
      },
      importSchema: (file: File, strategy: 'skip' | 'overwrite' | 'error' = 'skip') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('strategy', strategy);
        return this._request('/admin/import-schema', { method: 'POST', body: formData });
      },
      exportSchema: async (): Promise<Blob> => {
        const res = await fetch(`${this.baseUrl}/api/v1/admin/export-schema`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      },
      getDashboardStats: () => this._request('/admin/dashboard'),

      // Tenant Admin Ops
      createTenant: (tenantId: string) =>
        this._request('/admin/tenants', { method: 'POST', body: { tenant_id: tenantId } }),
      deleteTenant: (id: string) => this._request(`/admin/tenants/${id}`, { method: 'DELETE' }),
      updateTenant: (id: string, data: any) =>
        this._request(`/admin/tenants/${id}`, { method: 'PATCH', body: data }),
      listTenants: () => this._request<any[]>('/admin/tenants', { method: 'GET' }),
      updateTenantStatus: (id: string, status: 'active' | 'suspended' | 'archived') =>
        this._request(`/admin/tenants/${id}/status`, { method: 'PATCH', body: { status } }),

      // [NEW] Scoped Sandbox Management (Parent Context)
      listSandboxes: () => this._request<SandboxMetadata[]>('/admin/sandboxes', { method: 'GET' }),
      createSandbox: (
        name: string,
        cloneStrategy: string,
        cloneRecordLimit?: number,
        model?: string,
        initialPrompt?: string,
        collections?: string[],
        scripts?: string[],
        templates?: string[]
      ) =>
        this._request<SandboxMetadata>('/admin/sandboxes', {
          method: 'POST',
          body: {
            name,
            clone_strategy: cloneStrategy,
            clone_record_limit: cloneRecordLimit,
            model,
            initial_prompt: initialPrompt,
            collections,
            scripts,
            templates,
          },
        }),
      deleteSandbox: (id: string) => this._request(`/admin/sandboxes/${id}`, { method: 'DELETE' }),
      publishSandbox: (id: string) =>
        this._request<Plugin>(`/admin/sandboxes/${id}/publish`, { method: 'POST' }),
    };
  }

  // --- REPLACED AI INTERFACE ---
  get ai() {
    return {
      getActions: () => this._request<AiAction[]>('/admin/ai/actions'),
      createAction: (data: Partial<AiAction>) =>
        this._request('/admin/ai/actions', { method: 'POST', body: data }),
      deleteAction: (id: string | number) =>
        this._request(`/admin/ai/actions/${id}`, { method: 'DELETE' }),
      run: async (
        slug: string,
        variables: Record<string, any>,
        onChunk?: (text: string) => void
      ): Promise<{ result: string; metadata: any }> => {
        let path = `/ai/run/${slug}`;
        if (!path.startsWith('/api/v1')) {
          path = `/api/v1${path}`;
        }
        const url = new URL(`${this.baseUrl}${path}`);

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify({ variables }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `API Error: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';

        // Handle SSE Stream
        if (contentType.includes('text/event-stream')) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          let fullText = '';

          if (reader) {
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

              for (const line of lines) {
                if (line.startsWith('data:')) {
                  const dataVal = line.substring(5).trim();
                  if (dataVal && dataVal !== '[DONE]') {
                    let cleanChunk = dataVal;
                    // Safely unwrap strings if the backend serialized them as JSON
                    try {
                      const parsed = JSON.parse(dataVal);
                      if (typeof parsed === 'string') cleanChunk = parsed;
                    } catch (e) {}

                    // Replace escaped literal newlines
                    cleanChunk = cleanChunk.replace(/\\n/g, '\n');

                    if (onChunk) onChunk(cleanChunk);
                    fullText += cleanChunk;
                  }
                }
              }
            }
          }
          return { result: fullText, metadata: null };
        }

        // Standard JSON response fallback
        return await response.json();
      },

      // Architect (Child Context - Executed inside Sandbox scope)
      getSession: () => this._request<AiSession>('/admin/ai/session', { method: 'GET' }),
      chat: (prompt: string, model: string) =>
        this._request<AiSession>('/admin/ai/chat', { method: 'POST', body: { prompt, model } }),
      applySessionChanges: () => this._request<AiSession>('/admin/ai/apply', { method: 'POST' }),

      listPlugins: () => this._request<Plugin[]>('/admin/ai/plugins'),

      editCode: (prompt: string, currentCode: string, contextType: string, model: string) =>
        this._request<{ code: string }>('/admin/ai/edit-code', {
          method: 'POST',
          body: { prompt, current_code: currentCode, context_type: contextType, model },
        }),

      exportActions: async (): Promise<Blob> => {
        const res = await fetch(`${this.baseUrl}/api/v1/admin/export-ai-actions`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        return res.blob();
      },
      importActions: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('/admin/import-ai-actions', { method: 'POST', body: formData });
      },
    };
  }

  get scripts() {
    return {
      list: () =>
        this._request<
          | { local: Script[]; shared: Script[]; root_total: number; transparency_enabled: boolean }
          | Script[]
        >('/admin/scripts'),
      create: (data: Partial<Script>) =>
        this._request<Script>('/admin/scripts', { method: 'POST', body: data }),
      delete: (id: string | number) => this._request(`/admin/scripts/${id}`, { method: 'DELETE' }),
      run: (name: string, variables: any) =>
        this._request<any>(`/run/${name}`, { method: 'POST', body: variables }),
      export: async (): Promise<Blob> => {
        const res = await fetch(`${this.baseUrl}/api/v1/admin/export-scripts`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        return res.blob();
      },
      import: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('/admin/import-scripts', { method: 'POST', body: formData });
      },
    };
  }

  get templates() {
    return {
      list: () => this._request<Template[]>('/admin/templates'),
      create: (data: Partial<Template>) =>
        this._request<Template>('/admin/templates', { method: 'POST', body: data }),
      update: (id: string | number, data: Partial<Template>) =>
        this._request(`/admin/templates/${id}`, { method: 'PUT', body: data }),
      delete: (id: string | number) =>
        this._request(`/admin/templates/${id}`, { method: 'DELETE' }),
      export: async (): Promise<Blob> => {
        const res = await fetch(`${this.baseUrl}/api/v1/admin/export-templates`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        return res.blob();
      },
      import: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('/admin/import-templates', { method: 'POST', body: formData });
      },
    };
  }

  /**
   * Operations for a specific Collection.
   */
  collection(collectionId: string | number) {
    return {
      list: (options: QueryOptions = {}) =>
        this._request<ListResult<BaseRecord>>(`/collections/${collectionId}/records`, {
          method: 'GET',
          params: options,
        }),

      // [RENAMED] Fully mapped to the unified query engine
      searchRecordsWithSQLQueryEngine: (query: any) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/query`, {
          method: 'POST',
          body: { query },
        }),
      searchRecordsWithOSE: (query: string) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/search`, {
          method: 'GET',
          params: { q: query },
        }),
      searchRecordsInstantlyWithOSE: (query: string) =>
        this._request<InstantResult[]>(`/collections/${collectionId}/instant-search`, {
          method: 'GET',
          params: { q: query },
        }),

      create: (data: any) =>
        this._request<BaseRecord>(`/collections/${collectionId}/records`, {
          method: 'POST',
          body: { data },
        }),
      get: (recordId: string | number, options: { expand?: string } = {}) =>
        this._request<BaseRecord>(`/collections/${collectionId}/records/${recordId}`, {
          method: 'GET',
          params: options,
        }),
      update: (recordId: string | number, data: any) =>
        this._request<BaseRecord>(`/collections/${collectionId}/records/${recordId}`, {
          method: 'PUT',
          body: { data },
        }),
      patch: (recordId: string | number, data: any) =>
        this._request<BaseRecord>(`/collections/${collectionId}/records/${recordId}`, {
          method: 'PATCH',
          body: { data },
        }),

      toggleLike: async (userId: string, pinId: string) => {
        const likesColl = this.collection('likes');
        const pinsColl = this.collection('pins');

        let existing;
        try {
          existing = await likesColl.list({
            filter: `user_id = "${userId}" && pin_id = "${pinId}"`
          });
        } catch (err) {
          throw new Error("The 'likes' collection does not exist. Please create it in your Apex database dashboard.");
        }

        if (existing.total > 0) {
          // Unlike
          await likesColl.delete(existing.items[0].id);
          const pin = await pinsColl.get(pinId);
          const data = pin.data || pin;
          await pinsColl.patch(pinId, { 
            likes_count: Math.max(0, (data.likes_count || 0) - 1) 
          });
          return { liked: false };
        } else {
          // Like
          await likesColl.create({ user_id: userId, pin_id: pinId });
          const pin = await pinsColl.get(pinId);
          const data = pin.data || pin;
          await pinsColl.patch(pinId, { 
            likes_count: (data.likes_count || 0) + 1 
          });
          return { liked: true };
        }
      },
      delete: (recordId: string | number) =>
        this._request(`/collections/${collectionId}/records/${recordId}`, { method: 'DELETE' }),

      addRelation: (
        originRecordId: string | number,
        targetCollectionId: string | number,
        targetRecordId: string | number,
        relationName: string
      ) =>
        this._request(`/collections/${collectionId}/records/${originRecordId}/relations`, {
          method: 'POST',
          body: {
            target_collection_id: Number(targetCollectionId),
            target_record_id: Number(targetRecordId),
            relation_name: relationName,
          },
        }),

      removeRelation: (
        originRecordId: string | number,
        targetCollectionId: string | number,
        targetRecordId: string | number,
        relationName: string
      ) =>
        this._request(`/collections/${collectionId}/records/${originRecordId}/relations`, {
          method: 'DELETE',
          body: {
            target_collection_id: Number(targetCollectionId),
            target_record_id: Number(targetRecordId),
            relation_name: relationName,
          },
        }),

      searchVector: (field: string, vector: number[], limit = 10) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/search-vector`, {
          method: 'POST',
          body: { field, vector, limit },
        }),

      searchTextVector: (queryText: string, limit = 10) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/search-text-vector`, {
          method: 'POST',
          body: { query_text: queryText, limit },
        }),

      searchImageVector: (imageData: string, limit = 10) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/search-image-vector`, {
          method: 'POST',
          body: { image_data: imageData, limit },
        }),

      searchImageVectorWithText: (queryText: string, limit = 10) =>
        this._request<BaseRecord[]>(`/collections/${collectionId}/search-image-vector-with-text`, {
          method: 'POST',
          body: { query_text: queryText, limit },
        }),

      getVector: (recordId: string | number) =>
        this._request<Array<{ field_name: string; vector: number[]; model: string }>>(
          `/collections/${collectionId}/get-vector/${recordId}`,
          { method: 'GET' }
        ),
    };
  }

  get files() {
    return {
      list: (page = 1, perPage = 20) =>
        this._request<ListResult<StoredFile>>('/storage/files', {
          method: 'GET',
          params: { page, per_page: perPage },
        }),

      upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request<StoredFile>('/storage/upload', { method: 'POST', body: formData });
      },

      delete: (id: string | number) => this._request(`/storage/files/${id}`, { method: 'DELETE' }),

      getFileUrl: (filename: string | null | undefined, thumb?: string): string | null => {
        if (!filename) return null;
        if (filename.startsWith('http://') || filename.startsWith('https://')) {
          return filename;
        }
        const base = this.baseUrl.replace(/\/$/, '');
        const name = filename.replace(/^\//, '');
        let url = `${base}/api/v1/storage/file/${name}`;
        if (thumb) {
          url += `?thumb=${thumb}`;
        }
        return url;
      },
    };
  }

  get logs() {
    return {
      list: (page = 1, perPage = 50, level = '', source = '', search = '', type = 'system') =>
        this._request<any>('/admin/logs', {
          method: 'GET',
          params: {
            page,
            per_page: perPage,
            level: level || undefined,
            source: source || undefined,
            search: search || undefined,
            type,
          },
        }),
    };
  }

  async graphql(query: string, variables: any = {}): Promise<any> {
    return this._request('/graphql', {
      method: 'POST',
      isRoot: true,
      body: { query, variables },
    });
  }

  get utils() {
    return {
      stripHtmlTags: (html: string): string => {
        if (!html) return '';
        if (typeof document === 'undefined') return html.replace(/<[^>]*>?/gm, ''); // Node fallback
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
      },
    };
  }

  get sites() {
    return {
      deploy: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return this._request('/admin/site/deploy', { method: 'POST', body: formData });
      },
      listFiles: () => this._request<SiteFile[]>('/admin/site/files', { method: 'GET' }),
      delete: (path: string) =>
        this._request('/admin/site/files', { method: 'DELETE', params: { path } }),
    };
  }
}

// ===========================
// 4. Realtime Clients
// ===========================

export interface SubscriptionFilter {
  collectionId?: number;
  recordId?: number;
  eventType?: string;
  dataFilter?: Record<string, any>;
  channel?: string;
  customEvent?: string;
}

/**
 * ============================================
 * ApexKit Realtime — Usage Guide
 * ============================================
 *
 * This client supports Database Change Events, Custom Ephemeral Events,
 * and high-performance Instant Search over WebSockets.
 *
 * --------------------------------------------
 * 1. Start the connection
 * --------------------------------------------
 *
 * @example
 * const realtime = new ApexKitRealtimeWSClient(apex.baseUrl, apex.getToken());
 * realtime.connect();
 *
 * --------------------------------------------
 * 2. Subscribe to Data Changes (DB)
 * --------------------------------------------
 *
 * @example
 * realtime.subscribe({
 *   collectionId: 5,
 *   eventType: "Update",
 *   dataFilter: { priority: "high" }
 * });
 *
 * --------------------------------------------
 * 3. Subscribe to Custom Channels (Chat/Signals)
 * --------------------------------------------
 *
 * @example
 * realtime.subscribe({
 *   channel: "room_123",       // Namespace: tenant_id::room_123
 *   customEvent: "NewMessage"  // Optional: Filter specific event name
 * });
 *
 * --------------------------------------------
 * 4. Send a Signal (Client-to-Client Broadcast)
 * --------------------------------------------
 *
 * @example
 * realtime.sendSignal("room_123", "UserTyping", { user: "Alice" });
 *
 * --------------------------------------------
 * 5. Instant Search (Request-Response)
 * --------------------------------------------
 *
 * @example
 * const results = await realtime.search(1, "search query", 5);
 * console.log(results); // [{ id: 1, score: 2.5, snippet: {...} }]
 *
 * --------------------------------------------
 * 6. Handle Events
 * --------------------------------------------
 *
 * @example
 * realtime.onEvent((msg) => {
 *   // Handle DB Event
 *   if (msg.event === "Insert") {
 *      console.log("Record Created:", msg.payload.data);
 *   }
 *
 *   // Handle Custom Event
 *   if (msg.event === "Custom") {
 *      const { event, data } = msg.payload;
 *      if (event === "UserTyping") console.log(`${data.user} is typing...`);
 *   }
 * });
 * ============================================
 */
export class ApexKitRealtimeWSClient {
  private url: string;
  private token: string | null;
  private socket: WebSocket | null = null;
  private reconnectInterval: number = 3000;
  private listeners: Array<(msg: any) => void> = [];
  public isConnected: boolean = false;
  private currentFilter: SubscriptionFilter | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: Error) => void; timeout: any }
  >();

  constructor(url: string, token: string | null) {
    this.url = url.replace('http', 'ws') + '/ws';
    this.token = token;
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[ApexKit] Realtime Connected');
      this.isConnected = true;

      // [ADDED] Automatically Authenticate WS Streams immediately upon opening
      if (this.token && this.socket) {
        this.socket.send(
          JSON.stringify({
            type: 'Auth',
            payload: { token: this.token },
          })
        );
      }

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
        // [ADDED] Ignore internal Auth Acks
        if (msg.type === 'AuthSuccess' || msg.type === 'Error') return;

        this.notify(msg);
      } catch (e) {
        if (event.data === 'Pong') return;
        console.error('WS Parse Error', e);
      }
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.pendingRequests.forEach((req) => req.reject(new Error('Socket closed')));
      this.pendingRequests.clear();
      console.log('[ApexKit] Disconnected. Retrying...');
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
      this.socket.send(
        JSON.stringify({
          type: 'Subscribe',
          payload: {
            collection_id: filter.collectionId,
            record_id: filter.recordId,
            event_type: filter.eventType,
            filter: filter.dataFilter,
            channel: filter.channel,
            custom_event: filter.customEvent,
          },
        })
      );
    }
  }

  /**
   * Broadcast an ephemeral message to a specific channel.
   * Useful for "typing" indicators, cursors, or notifications.
   *
   * @param {string} channel - The channel name (e.g. "room_1")
   * @param {string} eventName - The event label (e.g. "UserTyping")
   * @param {Object} data - Arbitrary JSON payload
   */
  sendSignal(channel: string, eventName: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'Signal',
          payload: { channel, event: eventName, data },
        })
      );
    }
  }

  /**
   * Perform an Instant Search over WebSocket.
   * Returns a Promise that resolves with the results.
   *
   * @param {number|string} collectionId - The collection to search
   * @param {string} query - The search text
   * @param {number} [limit=10] - Max results
   * @returns {Promise<Array>} List of results
   */
  search(
    collectionId: number | string,
    query: string,
    limit: number = 10
  ): Promise<InstantResult[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) return reject(new Error('Socket not connected'));

      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Search request timed out'));
        }
      }, 5000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.socket.send(
        JSON.stringify({
          type: 'Search',
          payload: {
            collection_id: Number(collectionId),
            query,
            limit,
            request_id: requestId,
          },
        })
      );
    });
  }

  onEvent(callback: (msg: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(msg: any) {
    this.listeners.forEach((cb) => cb(msg));
  }

  private _handleRequestResponse(msg: any) {
    const req = this.pendingRequests.get(msg.request_id);
    if (req) {
      clearTimeout(req.timeout);
      this.pendingRequests.delete(msg.request_id);
      if (msg.type === 'Error') req.reject(new Error(msg.message));
      else req.resolve(msg.results);
    }
  }
}

/**
 * ============================================
 * ApexKit SSE Client — Usage Guide
 * ============================================
 *
 * Server-Sent Events are ideal for read-only streams where you don't
 * need to send data back to the server (e.g., news feeds, logs).
 *
 * --------------------------------------------
 * 1. Initialize & Connect
 * --------------------------------------------
 *
 * @example
 * const sse = new ApexKitRealtimeSSEClient('http://localhost:5000');
 *
 * // Connect to specific channel
 * sse.connect({
 *   channel: "room_123",       // Filters for tenant_id::room_123
 *   eventName: "NewMessage"    // Optional: Filter specific event type
 * });
 *
 * --------------------------------------------
 * 2. Handle Events
 * --------------------------------------------
 *
 * @example
 * sse.onEvent((msg) => {
 *   if (msg.type === "Custom") {
 *      console.log("Custom Event:", msg.payload.data);
 *   }
 *   if (msg.type === "Insert") {
 *      console.log("DB Insert:", msg.payload.data);
 *   }
 * });
 *
 * --------------------------------------------
 * 3. Cleanup
 * --------------------------------------------
 *
 * @example
 * sse.disconnect();
 * ============================================
 */
export class ApexKitRealtimeSSEClient {
  private baseUrl: string;
  private token: string | null;
  private source: EventSource | null = null;
  private listeners: Array<(msg: any) => void> = [];

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  connect({ channel, eventName }: { channel?: string; eventName?: string } = {}) {
    if (this.source) this.source.close();

    const params = new URLSearchParams();
    if (channel) params.append('channel', channel);
    if (eventName) params.append('event', eventName);

    // [ADDED] Forward the Token securely for stream authentication
    if (this.token) params.append('token', this.token);

    this.source = new EventSource(`${this.baseUrl}/sse?${params.toString()}`, {
      withCredentials: true,
    });

    this.source.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.notify(msg);
      } catch (e) {
        console.error('[ApexKit] SSE Parse Error', e);
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
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(msg: any) {
    this.listeners.forEach((cb) => cb(msg));
  }
}

// Initialize the root ApexKit client
export const apexRoot = new ApexKit('https://kipeles-vs--5000.hf.space');

// Export the tenant-specific instance for 'vortex'
export const apex = apexRoot.tenant('vortex');

