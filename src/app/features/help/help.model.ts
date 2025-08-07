export interface HelpArticle {
    id?: string;
    title: string;
    content: string;
    category: string;
    order_index: number;
    is_published: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface HelpCategory {
    category: string;
    count: number;
    articles?: HelpArticle[];
}