interface IAny {
    [key: string]: any
}

interface ITableDefinition {
    linePrefix: string,
    lineSuffix: string,
    nameOnly: boolean
}

type Condition = object | Array<object>

interface IQueryOptions {
    condition?: Condition,
    conditions?: Condition,
    select?: string,
    join?: Condition,
    joins?: Condition,
    coalesce?: boolean
}

type Schema = IAny;

type MySQL = IAny;

declare class Connection {
    createConnection (host: string, user: string, password: string, mysql: MySQL);

    connect (): void;

    query (query: string): Promise<any>;

    createDatabase (name: string): void;
}

declare class Builder {
    constructor ();

    get namespace () : string;

    get table () : string;

    get connection () : Connection

    get conn () : Connection

    canSearch () : boolean;

    isColumnDate (fieldType: string) : boolean

    removeSearch () : void

    safely (namespace: string, cb: Function) : IAny;

    alterTable (columns: string) : void

    rememberDateField (columnName: string, getDate: Function) : void

    updateDefaultDateFields (tableName: string) : object

    updateStaticDateFields (tableName: string, data: IAny): object

    makeForeignKey(ref: string, field: string, options: IAny) : string

    getTableDefinition (schema: Schema, options: ITableDefinition) : string

    getColumnValuePairs (data: IAny) : object

    getNewColumns (oldSchema: Schema, newSchema: Schema): object

    getOldColumns (oldSchema: Schema, newSchema: Schema): object

    getSchemaChanges (columns: Array<string>, schema: Schema): object;
    
    resHandler (resolve: Function, reject: Function, first: boolean): Function;

    applyChanges (oldSchema: Schema, newSchema: Schema) : void

    schema (tableName: string, schema: Schema) : void

    assignValues (data: object, sep: string) : string

    coalesce (select: string, options: object) : string

    getSelectedColumns (select: string, tableName: string) : string

    safelyPrefix (name: string, tableName: string, usedColumnNames: object) : string;

    namespaceColumns (arr: Array<string>, tableName: string, usedColumnNames: object) : void

    joinSafeSelect (select: string, join: object | Array<object>) : string;

    buildAnd (data: object): string

    buildOr (data: object): string

    buildJoinCondition (join: object): string

    buildJoin (join: object): string

    makeJoinClauses(join: object | Array<object>): string

    evalCondition (condition: object, join:  object | Array<object>, modifiers: string): string
}

declare class Model {
    setBuilder (builder: Builder): Model;

    getPrimaryKey ():  string;

    get isEmpty (): boolean;

    toObject (): object;

    toJSON (): string;

    save (): void
}

interface ModelResponse extends Model {
    [key: string]: any
}

declare class SQLifier {
    get builder (): Builder;
    get conn (): Connection;
    get table (): string;

    schema (tableName: string, schema: Schema): void;

    insert (data: object): Promise<ModelResponse>;

    update (condition: Condition, data: object) : Promise<any>

    exists (condition: Condition) : Promise<any>

    count (condition: Condition) : Promise<any>

    find ({ condition, select, join }: IQueryOptions) : Promise<Array<IAny>>

    findOne ({ condition, select, join }: IQueryOptions): Promise<ModelResponse>

    findLatestOne ({ condition, select, join }: IQueryOptions): Promise<ModelResponse>

    findOldestOne ({ condition, select, join, coalesce }: IQueryOptions) : Promise<ModelResponse>

    search ({ condition, select, join, coalesce }: IQueryOptions): Promise<Array<IAny>>

    unionSearch ({ conditions, select, joins, coalesce }: IQueryOptions): Promise<Array<IAny>>;
}

declare class SQLDate {
    static now () : string

    static toSQLDatetime (date: string | Date) : string
}

export {
    SQLifier,
    Connection,
    SQLDate
}
