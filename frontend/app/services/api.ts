import axios, { AxiosInstance } from 'axios';

// works with IOS simulator
const DEFAULT_BASE = 'http://localhost:8080';

export interface RegisterRequest {
    username: string;
    password: string;
    // firstName?: string;
    // lastName?: string;
    // role?: string; 
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
}

export interface HealthProfile {
    id?: number;
    age?: number;
    height?: number;
    weight?: number;
    gender?: string;
    allergies?: string[];
    dietaryPreference?: string;
}

export interface HealthProfileUpdateRequest {
    age?: number;
    height?: number;
    weight?: number;
    gender?: string;
    allergies?: string[];
    dietaryPreference?: string;
}

export interface FoodAnalysisResult {
    foodName: string;
    servingDescription: string;
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    fiberGrams: number;
    confidence: number;
    reasoning: string;
}

class ApiService {
    private client: AxiosInstance;

    constructor(baseURL = DEFAULT_BASE) {
        this.client = axios.create({ baseURL, timeout: 10000 });
    }

    // setBaseUrl(url: string) {
    //     this.client.defaults.baseURL = url;
    // }

    setToken(token: string) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    getToken(): string | null {
        const authHeader = this.client.defaults.headers.common['Authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }

    clearToken() {
        delete this.client.defaults.headers.common['Authorization'];
    }

    // -auth
    async register(payload: RegisterRequest): Promise<AuthResponse> {
        const res = await this.client.post<AuthResponse>('/api/auth/register', payload);
        return res.data;
    }

    async login(payload: LoginRequest): Promise<AuthResponse> {
        const res = await this.client.post<AuthResponse>('/api/auth/login', payload);
        return res.data;
    }

    // nutrition
    async getFood(name: string): Promise<any> {
        const res = await this.client.get('/api/nutrition/food', { params: { name } });
        return res.data;
    }

    // image classification
    async classifyImage(imageUrl: string): Promise<any> {
        const res = await this.client.get('/api/classify', { params: { imageUrl } });
        return res.data;
    }

    // profile
    async getMyProfile(): Promise<HealthProfile> {
        const res = await this.client.get<HealthProfile>('/api/profile/me');
        return res.data;
    }

    // update profile
    async updateMyProfile(profile: HealthProfileUpdateRequest): Promise<HealthProfile> {
        const res = await this.client.put<HealthProfile>('/api/profile/me', profile);
        return res.data;
    }

    // barcode lookup 
    async getFoodByBarcode(barcode: string): Promise<any> {
        const res = await this.client.get('/api/nutrition/barcode', { params: { barcode } });
        return res.data;
    }

    async analyzeFood(imageUrl: string): Promise<FoodAnalysisResult> {
        const res = await this.client.post<FoodAnalysisResult>(
            '/api/classify/analyze',
            null,
            { params: { imageUrl } }
        );
        return res.data;
    }
}

const api = new ApiService();
export default api;
export { ApiService };
