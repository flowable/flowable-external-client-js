export type ListResult<T> = {
    data: T[];
    total: number;
    start: number;
    sort: string;
    order: string;
    size: number;
}
