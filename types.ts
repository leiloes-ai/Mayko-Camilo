
export type Role = 'master' | 'admin' | 'supervisor' | 'inspector' | 'client';

/**
 * Defines the access level for a user to a specific module.
 * - `edit`: Full create, update, and delete permissions.
 * - `update`: Can only update existing records (e.g., change status), but cannot create or delete.
 * - `view`: Read-only access.
 * - `hidden`: The module is not visible to the user.
 */
export type PermissionLevel = 'view' | 'edit' | 'update' | 'hidden';

export type User = {
  id: string; // Document ID from Firestore
  name: string;
  email: string;
  roles: Role[];
  photoURL?: string;
  fcmToken?: string; // For Firebase Cloud Messaging (Push Notifications)
  requesterId?: string; // ID of the linked requester for client roles
  forcePasswordChange?: boolean;
  permissions: {
    dashboard: PermissionLevel;
    appointments: PermissionLevel;
    pendencies: PermissionLevel;
    newRequests: PermissionLevel;
    reports: PermissionLevel;
    users: PermissionLevel;
    settings: PermissionLevel;
    financial: PermissionLevel;
  };
};

export type AppointmentStatus = 'Solicitado' | 'Agendado' | 'Em Andamento' | 'Concluído' | 'Pendente' | 'Finalizado';

export interface Message {
  authorId: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface Appointment {
  id: number; // Index-based ID for React keys
  stringId?: string; // Document ID from Firestore
  displayId?: string; // User-editable reference ID
  requester: string; 
  demand: string; 
  inspectionType: string;
  licensePlate: string;
  description: string;
  patio: string; 
  date: string;
  inspectorId: string;
  status: AppointmentStatus;
  notes: string;
  messages?: Message[];
}

export type PendencyStatus = 'Pendente' | 'Em Andamento' | 'Finalizada';

export interface Pendency {
  id: number; // Index-based ID for React keys
  stringId?: string; // Document ID from Firestore
  appointmentId: string; // The stringId of the linked appointment
  title: string;
  description: string;
  responsibleId: string;
  status: PendencyStatus;
  creationDate: string;
}


// Types for dynamic settings
export interface SettingCategory {
    id: string;
    name: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: FinancialTransactionType;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Settings {
    id?: string;
    appName: string;
    logoUrl: string | null;
    requesters: SettingCategory[];
    demands: SettingCategory[];
    inspectionTypes: SettingCategory[];
    patios: SettingCategory[];
    statuses: SettingCategory[];
    financialCategories: FinancialCategory[];
    services: Service[];
    enableSoundAlert?: boolean;
    enableVibrationAlert?: boolean;
    masterPassword?: string;
}

// Type for requests staged from Excel upload
export type StagedRequest = Omit<Appointment, 'id' | 'stringId'>;


// Types for theme customization
export type Theme = 'light' | 'dark';
export type TextPalette = 'gray' | 'slate' | 'stone';
export type ThemePalette = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'red' | 'navy' | 'maroon';

// Types for Financial Module
export type FinancialTransactionType = 'Receita' | 'Despesa';

export type FinancialPage = 'Dashboard' | 'Transações' | 'Contas a pagar' | 'Contas a receber' | 'Relatórios' | 'Categorias & Clientes' | 'Contas';

export interface FinancialAccount {
  id: number; // Index-based ID
  stringId?: string; // Firestore ID
  name: string;
  type: string; // e.g., Conta Corrente, Dinheiro
  initialBalance: number;
  color?: string; // Tailwind color class, e.g., 'bg-blue-500'
}

export type ThirdPartyType = 'Cliente' | 'Fornecedor';

export interface ThirdParty {
  id: number; // Index-based ID
  stringId?: string; // Firestore ID
  name: string;
  type: ThirdPartyType;
  documentType: 'CPF' | 'CNPJ' | 'N/A';
  documentNumber?: string;
  email?: string;
  phone?: string;
}

export type PayableReceivableStatus = 'Pendente' | 'Paga' | 'Vencida';

export interface FinancialTransaction {
  id: number; // Index-based ID
  stringId?: string; // Firestore ID
  description: string;
  type: FinancialTransactionType;
  amount: number;
  date: string; // For immediate transactions, this is the transaction date. For paid bills, this becomes the payment date.
  category: string;
  accountId?: string; // Link to a FinancialAccount (only after payment for payables/receivables)
  thirdPartyId?: string; // Link to a Client or Supplier
  appointmentId?: string; // Optional link to an appointment
  notes?: string;
  
  // Fields for Accounts Payable/Receivable
  isPayableOrReceivable?: boolean;
  dueDate?: string; // Data de Vencimento
  status?: PayableReceivableStatus;
  paymentDate?: string; // Data que foi efetivamente paga
}
