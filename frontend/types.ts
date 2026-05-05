
export enum Role {
  COMMERCIAL = 'Comercialização',
  OPERATIONS = 'Operações',
  CREDIT_RISK = 'Crédito e Risco',
  CONSULTANCY = 'Consultoria',
  ADVISORY = 'Assessoria',
  COMMON = 'Comum',
  SERVICE_USERS = 'Usuários de Serviços',
  MARKETING = 'Marketing',
}

export enum ClientStatus { // Status Operacional
  READY_FOR_DATASUL = 'Pronto Para Input no Data Sul',
  COMPLETED = 'Concluído',
  LEAD = 'Lead',
  LEAD_DISQUALIFIED = 'Lead Desqualificado',
  BLOCKED_COMMERCIALIZATION = 'Bloqueado para Comercialização',
}

export type CreditStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'Reprovado';

// Removed rigid ContactType enum as it now comes from DB
export type RegistrationCategory = 'Consultoria' | 'Assessoria' | 'Comercialização' | 'Fornecedores Diversos';

export interface DbContactType {
  id: string;
  nome: string;
}

export interface Contact {
  id: string;
  type: string; // Name of the contact type from DB
  name: string;
  email: string;
  phone: string;
  position: string; // Cargo
}

export const JOB_TITLE_OPTIONS = [
  'Analista de mercado',
  'Gerente / Coordenador',
  'Diretor (a)',
  'Dono / Sócio / CEO',
  'Freelancer / Consultor',
  'Estudante',
  'Vendedor / RTV',
  'Produtor Rural',
  'Revendedor Agrícola',
  'Corretor de grãos',
  'Cooperativas',
  'Cerealistas'
];

export interface Notification {
  id: string;
  source_table: string;
  source_id: string;
  event_type: string;
  title: string;
  body: string;
  payload: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientData {
  id: string;
  status: ClientStatus; // Status Operacional
  registrationType: 'CLIENTE' | 'LEAD';

  category: RegistrationCategory; // Categoria Principal / Contexto de Edição Atual
  activeServices: RegistrationCategory[]; // Lista de produtos/serviços ativos

  // Identificação (Comercial)
  docType: 'CNPJ' | 'CPF';
  document: string; // CNPJ ou CPF
  name: string; // Razão Social / Nome
  tradeName: string; // Nome Fantasia (Opcional)
  alias: string; // Nome Abreviado

  // Endereço Principal (Comercial - Auto via API p/ CNPJ)
  zipCode: string;
  address: string;
  number: string;
  district: string; // Bairro
  city: string;
  state: string;
  country: string;

  // Info Fiscal/Agro (Comercial)
  ie: string; // Inscrição Estadual
  supplierGroupCode: string;
  clientGroupCode: string; // Novo Campo: Código do Grupo Cliente (Espelho do Fornecedor)
  identification: string; // Novo Campo: 1-Cliente, 2-Fornecedor, 3-Ambos
  rg: string; // Para PF
  economicGroup: string; // Antigo GE

  // Dados Agronômicos (Comercial)
  plantedAreaSize: string;
  farmQuantity: string;
  origin: string;
  type: string; // Tipo do client/lead
  profile: string; // Novo Campo: Perfil
  jobTitle: string; // Novo Campo: Cargo
  crops: string[]; // Culturas Plantadas

  // Info Adicional (Comercial)
  car: string; // Anexo
  matricula: string; // Anexo

  // Dados de Cobrança / Matriz (Comercial - Auto Logica)
  docCob: string;
  zipCodeCob: string;
  addressCob: string;
  districtCob: string;
  stateCob: string;
  nameCob: string; // Razão Social Cob
  cityCob: string;
  ieCob: string;

  // Dados Bancários (Ambos)
  bankName: string;
  agency: string;
  account: string;
  accountDigit: string; // Novo Campo: Dígito da Conta
  accountHolder: string;
  bankProofUrl: string; // Anexo

  // Info Civil/Pessoal (Ambos)
  civilStatus: string;
  rgPersonal: string;

  // Sistema (Auto)
  nature: string;
  portador: string;
  fiscal: string;
  paymentCondition: string;
  situation: string; // Novo Campo: Situação (1 - Ativo)
  observation: string; // Novo Campo: Observação

  // Contatos (Lista MKT e Fat)
  contacts: Contact[];

  // Operações (Exclusivo Operações)
  expenseTypeStandard: string;
  revenueTypeStandard: string;
  registryCode: string; // Novo campo: Código do Cadastro (Data Sul)

  // --- CRÉDITO E RISCO (Novos Campos) ---
  requiresCreditAnalysis: boolean; // Checkbox do Comercial

  // Comercial preenche se requiresCreditAnalysis = true
  financialStatementFile: string; // Anexo Demonstrativo Financeiro
  taxReturnFile: string; // Anexo Imposto de Renda
  commercialOpinion: string; // Parecer Comercial (Texto)

  // Time de Crédito preenche
  creditStatus: CreditStatus; // Status de Crédito independente
  creditScore: string;
  creditLimitRequested: string;
  creditLimitAvailable: string;
  creditOpinion: string; // Parecer de Crédito (Obrigatório se Reprovado)

  // Compliance
  trabalhoEscravo: boolean;

  // Metadata
  created_at?: string;
}

export const INITIAL_CLIENT_DATA: ClientData = {
  id: '',
  status: ClientStatus.READY_FOR_DATASUL,
  registrationType: 'CLIENTE',
  category: 'Comercialização',
  activeServices: ['Comercialização'],
  docType: 'CNPJ',
  document: '',
  name: '',
  tradeName: '',
  alias: '',
  zipCode: '',
  address: '',
  number: '',
  district: '',
  city: '',
  state: '',
  country: 'Brasil',
  ie: '',
  supplierGroupCode: '',
  clientGroupCode: '',
  identification: '',
  rg: '',
  economicGroup: '',
  plantedAreaSize: '',
  farmQuantity: '',
  origin: '',
  type: '',
  profile: '',
  jobTitle: '',
  crops: [],
  car: '',
  matricula: '',
  docCob: '',
  zipCodeCob: '',
  addressCob: '',
  districtCob: '',
  stateCob: '',
  nameCob: '',
  cityCob: '',
  ieCob: '',
  bankName: '',
  agency: '',
  account: '',
  accountDigit: '',
  accountHolder: '',
  bankProofUrl: '',
  civilStatus: 'Outros',
  rgPersonal: '',
  nature: '2 - Pessoa Jurídica',
  contacts: [],
  registryCode: '',
  portador: '',
  fiscal: 'suspenso p/ pagtos',
  paymentCondition: '',
  expenseTypeStandard: '',
  revenueTypeStandard: '',
  situation: '1 - Ativo',
  observation: '',
  requiresCreditAnalysis: false,
  financialStatementFile: '',
  taxReturnFile: '',
  commercialOpinion: '',
  creditStatus: 'Pendente',
  creditScore: '',
  creditLimitRequested: '',
  creditLimitAvailable: '',
  creditOpinion: '',
  trabalhoEscravo: false,
  created_at: '',
};
