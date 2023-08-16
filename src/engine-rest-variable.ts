export type EngineRestVariableType = 'string' | 'short' | 'integer' | 'long' | 'double' | 'boolean' | 'date' | 'instant' | 'localDate' | 'localDateTime' | 'json';

export type EngineRestVariable = {
    name: string;
    type: EngineRestVariableType | string;
    value: any;
    valueUrl?: string | null;
}
