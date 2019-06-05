export interface queryParam {
    tablesList: string[];
    tablesAlias: string[];
    tablesColumns: any[];
    tablesJoins: any[];
    tableIndexColumn: string;
    tablesColumnsAlias?: any[];
    filter?: {};
    pageSize?: number;
    pageNumber?: number;
    sortField?: string;
    sortOrder?: string;
    userFilter?: string;
}