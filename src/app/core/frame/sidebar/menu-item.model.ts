export interface MenuItem {
    icon: string;
    label: string;
    route: string;
    badge?: number;
    children?: MenuItem[];
}