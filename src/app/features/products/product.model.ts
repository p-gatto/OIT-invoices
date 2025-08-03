export interface Product {
    id?: string;
    name: string;
    description?: string;
    unit_price: number;
    tax_rate: number;
    category?: string;
    unit: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ProductCategory {
    name: string;
    count: number;
}