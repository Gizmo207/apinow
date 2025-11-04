// Centralized provider registry type definitions

export type Engine =
  | 'sqlite' 
  | 'mysql' 
  | 'postgresql'
  | 'mongodb' 
  | 'mssql' 
  | 'mariadb'
  | 'googlesheets';

export type FieldType = 
  | 'text' 
  | 'password' 
  | 'number' 
  | 'select' 
  | 'textarea' 
  | 'checkbox' 
  | 'file';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  helpText?: string;
  pattern?: RegExp;
  validate?: (value: string) => true | string;
  accept?: string; // for file inputs
}

export interface ProviderConfig {
  key: string;                    // e.g., 'mysql-aiven'
  engine: Engine;
  name: string;                   // 'Aiven'
  brand?: string;                 // optional e.g. 'Aiven (MySQL)'
  fields: FieldConfig[];
  connectionStringFormat?: string;
  sslRequired?: boolean;
  docsUrl?: string;
  helpSteps?: string[];
  // Transform form values into final connection data
  normalize?: (values: Record<string, any>) => { 
    connectionString?: string; 
    filePath?: string;
    extras?: any 
  };
}
