export interface item {
    path: string;
    title: string;
    icon: string;
    children?: string;
}

export interface menus {
    menu: item[];
}
