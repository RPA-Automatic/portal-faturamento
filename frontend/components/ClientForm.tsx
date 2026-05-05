
import React, { useState, useEffect } from 'react';
import { ClientData, ClientStatus, Role, INITIAL_CLIENT_DATA, CreditStatus, RegistrationCategory, DbContactType, JOB_TITLE_OPTIONS } from '../types';
import { FormInput } from './FormInput';
import { MultiSelect } from './MultiSelect';
import { ContactList } from './ContactList';
import { fetchCnpjData, fetchCepData } from '../services/brasilApi';
import { checkSlaveLaborList } from '../services/slaveLaborApi';
import { uploadDocument } from '../services/storage';
import { supabase } from '../lib/supabase';
import { formatCNPJ, formatCPF, cleanDigits, generateMatrizCnpj, formatCEP, formatRG } from '../utils';

const AREA_SIZE_OPTIONS = [
  '0 a 3.000 hectare',
  '3.000 a 5.000 hectare',
  '5.000 a 10.000 hectare',
  'Mais de 10.000 hectare'
];

const PROFILE_OPTIONS = [
  'Agro Indústria',
  'Agtech e Tecnologia',
  'Loja / Distribuidor / Revenda',
  'Produtor Rural',
  'Educação e Ensino',
  'Máquinas e Equipamentos',
  'Serviços e Consultorias',
  'Cooperativa',
  'Fintech / Banco / Crédito'
];

const CROP_OPTIONS = ['Milho', 'Soja', 'Trigo', 'Café', 'Arroz', 'Feijão', 'Gergelim'];

const SUPPLIER_GROUP_OPTIONS = [
  { code: '10', label: '10 - Fornecedores Commodities PF' },
  { code: '15', label: '15 - Fornecedores Commodities PJ' },
  { code: '20', label: '20 - Fornecedores Exterior' },
  { code: '30', label: '30 - Fornecedores Servicos' },
  { code: '35', label: '35 - Transportadoras' },
  { code: '40', label: '40 - Portos e Terminais' },
  { code: '45', label: '45 - Filiais BIOND' },
  { code: '50', label: '50 - Funcionarios' },
  { code: '55', label: '55 - Intercompany' },
  { code: '60', label: '60 - Impostos' },
];

const ALL_CATEGORIES: RegistrationCategory[] = ['Consultoria', 'Assessoria', 'Comercialização', 'Fornecedores Diversos'];

export const DOC_FOLDER_MAP: Record<string, string> = {
  car: 'car',
  matricula: 'matricula',
  bankProofUrl: 'banco',
  financialStatementFile: 'financeiro',
  taxReturnFile: 'ir',
};

interface EconomicGroup {
  id: string;
  name: string;
}

interface ClientFormProps {
  initialData?: ClientData;
  roles: Role[];
  contactTypes: DbContactType[];
  onSave: (data: ClientData, files?: Record<string, File>, opts?: { skipViewChange?: boolean; skipFetch?: boolean }) => Promise<void | string>;
  onCancel: () => void;
  onAddIE?: (data: ClientData) => void;
  onEdit?: () => void;
  readOnly?: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, roles, contactTypes, onSave, onCancel, onAddIE, onEdit, readOnly }) => {
  const [formData, setFormData] = useState<ClientData>(initialData || INITIAL_CLIENT_DATA);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [filesToUpload, setFilesToUpload] = useState<Record<string, File>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const isExistingRecord = !!initialData && !!initialData.id;
  const isNew = !isExistingRecord;

  const isLead = formData.status === ClientStatus.LEAD;
  const isOriginallyLead = isExistingRecord && initialData?.status === ClientStatus.LEAD;

  const hasComercializacao = formData.activeServices.includes('Comercialização');
  const isEconomicGroupRequired = formData.activeServices.some(s => s !== 'Fornecedores Diversos');

  const [isFormOpen, setIsFormOpen] = useState(isExistingRecord || (!!initialData && !!initialData.document));

  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCob, setLoadingCob] = useState(false);
  const [validatingSlaveLabor, setValidatingSlaveLabor] = useState(false);

  const [slaveLaborResult, setSlaveLaborResult] = useState<'clean' | 'dirty' | null>(
      initialData?.id ? (initialData.trabalhoEscravo ? 'dirty' : 'clean') : null
  );
  const [showSlaveLaborModal, setShowSlaveLaborModal] = useState(false);

  const [availableGroups, setAvailableGroups] = useState<EconomicGroup[]>([]);
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [isEconomicGroupModalOpen, setIsEconomicGroupModalOpen] = useState(false);
  const [economicGroupSearch, setEconomicGroupSearch] = useState('');

  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', observation: '' });

  const [isAddingService, setIsAddingService] = useState(false);
  const [hasAddedNewService, setHasAddedNewService] = useState(false);

  const [notification, setNotification] = useState<{ type: 'error' | 'warning' | 'success', message: string } | null>(null);

  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s|-)\S/g, (m) => m.toUpperCase());
  };

  const formatAddressNumber = (num: string) => {
    if (!num) return '';
    const cleanNum = num.trim();
    const onlyDigits = cleanNum.replace(/\D/g, '');
    if (onlyDigits.length > 3 && onlyDigits === cleanNum) {
      return Number(onlyDigits).toLocaleString('pt-BR');
    }
    return cleanNum;
  };

  const formatFullAddress = (street?: string, number?: string, streetType?: string) => {
    if (!street) return '';

    const apiStreet = street.trim();
    const apiType = streetType?.trim() || '';

    let combinedStreet = (apiType && !apiStreet.toUpperCase().startsWith(apiType.toUpperCase()))
      ? `${apiType} ${apiStreet}`
      : apiStreet;

    combinedStreet = toTitleCase(combinedStreet);

    const cleanNum = formatAddressNumber(number);

    if (!cleanNum || cleanNum === '' || cleanNum.toUpperCase() === 'SN' || cleanNum.toUpperCase() === 'S/N') {
        return combinedStreet.substring(0, 40);
    }

    const separator = ', ';
    const combined = `${combinedStreet}${separator}${cleanNum}`;

    if (combined.length <= 40) {
        return combined;
    }

    const reservedSpace = separator.length + cleanNum.length;
    if (reservedSpace >= 40) {
      return combined.substring(0, 40);
    }

    const availableForStreet = 40 - reservedSpace;
    return combinedStreet.substring(0, availableForStreet) + separator + cleanNum;
  };

  useEffect(() => {
    const loadInitialGroupName = async () => {
      if (formData.economicGroup && isUuid(formData.economicGroup)) {
        const { data } = await supabase.from('grupo_economico').select('name').eq('id', formData.economicGroup).single();
        if (data) setSelectedGroupName(data.name);
      } else {
        setSelectedGroupName(formData.economicGroup);
      }
    };
    loadInitialGroupName();
  }, [initialData?.id, formData.economicGroup]);

  const fetchGroups = async (search: string) => {
    let query = supabase.from('grupo_economico').select('id, name').order('name');
    if (search) {
      query = query.ilike('name', `%${search}%`);
    } else {
      query = query.limit(10);
    }
    const { data } = await query;
    if (data) setAvailableGroups(data);
  };

  useEffect(() => {
    if (isEconomicGroupModalOpen) {
      fetchGroups(economicGroupSearch);
    }
  }, [isEconomicGroupModalOpen, economicGroupSearch]);

  const handleViewAttachment = async (storagePath: string, label: string) => {
      try {
          if (!storagePath) return;
          const { data, error } = await supabase.storage
              .from('docs_cadastros')
              .createSignedUrl(storagePath, 60 * 30);

          if (error) throw error;
          if (!data?.signedUrl) throw new Error('Signed URL não gerada.');

          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } catch (e: any) {
          console.error('Erro ao gerar URL assinada:', e);
          showNotification(`Não foi possível abrir o anexo (${label}).`, 'error');
      }
  };

  const getFileExt = (fileName: string) => {
      const parts = fileName.split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1] : '';
      return ext.toLowerCase();
  };

  const FileIcon: React.FC<{ ext: string }> = ({ ext }) => {
      return (
          <div className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-100 bg-white">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
          </div>
      );
  };

  const handleRemoveAttachment = (field: keyof ClientData) => {
      setFilesToUpload(prev => {
          const next = { ...prev };
          delete (next as any)[field as string];
          return next;
      });
      setFormData(prev => ({ ...prev, [field]: '' } as any));
      clearFieldError(field as string);
  };

  const AttachmentItem: React.FC<{
      label: string;
      field: keyof ClientData;
      storagePath?: string;
      selectedFile?: File;
      canRemove: boolean;
  }> = ({ label, field, storagePath, selectedFile, canRemove }) => {
      const fileName = selectedFile?.name || (storagePath ? (storagePath.split('/').pop() || 'arquivo') : 'arquivo');
      const ext = getFileExt(fileName).toUpperCase();
      const isClickable = !!storagePath && !selectedFile;

      return (
          <div className="relative py-1 group">
              <div className="flex items-center justify-between gap-4 border border-gray-200 bg-white rounded-xl px-4 py-3 shadow-sm hover:border-gray-300 transition-all max-w-lg">
                  <div
                      className={`flex items-center gap-4 flex-1 min-w-0 ${isClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => isClickable && handleViewAttachment(storagePath!, label)}
                  >
                      <FileIcon ext={ext} />
                      <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                              {fileName}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {ext || 'PDF'}
                          </span>
                      </div>
                  </div>

                  {canRemove && (
                      <button
                          type="button"
                          onClick={() => handleRemoveAttachment(field)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remover arquivo"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                      </button>
                  )}
              </div>
          </div>
      );
  };

  const AttachmentField: React.FC<{
      label: string;
      field: keyof ClientData;
      requiredMark?: boolean;
      error?: string;
      labelClassName?: string;
      inputClassName?: string;
  }> = ({ label, field, requiredMark, error, labelClassName, inputClassName }) => {
      const storagePath = (formData as any)[field] as string | undefined;
      const selectedFile = (filesToUpload as any)[field as string] as File | undefined;
      const locked = isFieldLocked(field);
      const hasSomething = !!storagePath || !!selectedFile;

      if (locked) {
          if (!storagePath) return null;
          return (
              <div className="mb-4">
                  <label className={`block text-sm font-semibold mb-1 ${labelClassName || 'text-gray-700'}`}>
                      {label}
                  </label>
                  <AttachmentItem
                      label={label}
                      field={field}
                      storagePath={storagePath}
                      canRemove={false}
                  />
              </div>
          );
      }

      if (hasSomething) {
          return (
              <div className="mb-4">
                  <label className={`block text-sm font-semibold mb-1 ${labelClassName || 'text-gray-700'} ${error ? 'text-red-600' : ''}`}>
                      {label} {requiredMark ? <span className="text-red-500">*</span> : null}
                  </label>
                  <AttachmentItem
                      label={label}
                      field={field}
                      storagePath={storagePath}
                      selectedFile={selectedFile}
                      canRemove={true}
                  />
                  {error && <span className="text-xs text-red-600 font-semibold mt-1 block">{error}</span>}
              </div>
          );
      }

      return (
          <FormInput
              label={label}
              name={field as string}
              type="file"
              onChange={handleFileChange}
              disabled={locked}
              requiredMark={requiredMark}
              error={error}
              labelClassName={labelClassName}
              className={inputClassName}
          />
      );
  };

  const isOperations = roles.includes(Role.OPERATIONS);
  const isCreditRisk = roles.includes(Role.CREDIT_RISK);
  const canCreateNewIEByRole = [Role.ADVISORY, Role.CONSULTANCY, Role.SERVICE_USERS, Role.COMMERCIAL]
    .some(role => roles.includes(role));
  const isEligibleClientTypeForIE = ['Cliente', 'Fornecedor', 'Cliente/Fornecedor'].includes(formData.type);

  const isBlocked = formData.status === ClientStatus.BLOCKED_COMMERCIALIZATION;
  const globalReadOnly = !!readOnly;

  const isComercializacaoBlocked = isBlocked && formData.activeServices.includes('Comercialização');

  const categoryToRole: Record<string, Role> = {
    'Comercialização': Role.COMMERCIAL,
    'Assessoria': Role.ADVISORY,
    'Consultoria': Role.CONSULTANCY,
    'Fornecedores Diversos': Role.SERVICE_USERS
  };

  const canUserManageService = (service: RegistrationCategory) => {
    if (!globalReadOnly) return true;
    if (roles.includes(Role.OPERATIONS)) return true;
    return roles.includes(categoryToRole[service]);
  };

  const canShowEditButton = () => {
    if (!readOnly || !onEdit) return false;
    if (roles.includes(Role.OPERATIONS)) return true;

    const hasOnlyCreditRisk = roles.includes(Role.CREDIT_RISK) && roles.every(r => r === Role.CREDIT_RISK || r === Role.COMMON || r === Role.MARKETING);
    if (hasOnlyCreditRisk && !formData.requiresCreditAnalysis) {
        return false;
    }

    if (roles.includes(Role.CREDIT_RISK)) return true;
    return formData.activeServices.some(service => roles.includes(categoryToRole[service]));
  };

  const canUserConvertLead = () => {
    if (!isLead || !isExistingRecord) return false;
    if (roles.includes(Role.OPERATIONS)) return true;
    const requiredRole = categoryToRole[formData.category];
    return roles.includes(requiredRole);
  };

  function isFieldLocked(fieldName: keyof ClientData) {
      if (globalReadOnly) return true;

      const CREDIT_EDITABLE_FIELDS = [
        'creditStatus',
        'creditScore',
        'creditLimitRequested',
        'creditLimitAvailable',
        'creditOpinion'
      ];

      if (isCreditRisk && !isOperations) {
          if (CREDIT_EDITABLE_FIELDS.includes(fieldName as string)) {
              return isBlocked;
          }
          return true;
      }

      if (fieldName === 'requiresCreditAnalysis') {
          return !!initialData?.requiresCreditAnalysis;
      }

      if (fieldName === 'rg') {
          const hasRgInitial = !!initialData?.rg && initialData.rg.trim() !== '';
          return hasRgInitial;
      }

      const REQUESTED_EDITABLE_FIELDS = [
          'civilStatus',
          'plantedAreaSize',
          'farmQuantity',
          'profile',
          'jobTitle',
          'origin',
          'crops',
          'bankName',
          'agency',
          'account',
          'accountDigit',
          'accountHolder',
          'bankProofUrl',
          'car',
          'matricula',
          'contacts'
      ];

      if (REQUESTED_EDITABLE_FIELDS.includes(fieldName as string)) {
          return false;
      }

      const BASE_DATA_FIELDS = [
        'document', 'name', 'tradeName', 'docType', 'identification', 'economicGroup',
        'supplierGroupCode', 'clientGroupCode', 'zipCode', 'address', 'number',
        'district', 'city', 'state', 'country', 'ie', 'ieCob', 'docCob',
        'zipCodeCob', 'addressCob', 'districtCob', 'stateCob', 'nameCob',
        'cityCob', 'nature'
      ];

      const isSlaveLaborEdit = !isNew && !isOriginallyLead && formData.trabalhoEscravo;
      const CREDIT_REQUEST_FIELDS = ['requiresCreditAnalysis', 'financialStatementFile', 'taxReturnFile', 'commercialOpinion', 'creditLimitRequested'];

      if (isSlaveLaborEdit && CREDIT_REQUEST_FIELDS.includes(fieldName)) {
          return true;
      }

      if (isNew || isOriginallyLead) {
          if (fieldName === 'registryCode') return true;
          if (fieldName === 'type') return isLead;
          return false;
      }

      if (fieldName === 'registryCode') {
          return !isOperations;
      }

      if (fieldName === 'economicGroup') {
          const isEmpty = !formData.economicGroup || formData.economicGroup.trim() === '';
          if (isEmpty) return false;
      }

      if (BASE_DATA_FIELDS.includes(fieldName)) {
          return true;
      }

      if (fieldName === 'nature') return true;

      if (fieldName === 'type') {
          if (isOperations) return false;
          const userHasPermissionForThisType = roles.includes(categoryToRole[formData.category]);
          return !userHasPermissionForThisType || (isBlocked && formData.category === 'Comercialização');
      }

      return false;
  }

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
        setFieldErrors(prev => {
            const newErrs = { ...prev };
            delete newErrs[name];
            return newErrs;
        });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'zipCode' || name === 'zipCodeCob') {
      finalValue = formatCEP(value);
    } else if (name === 'state' || name === 'stateCob') {
      finalValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 2);
    } else if (name === 'rg') {
      finalValue = formatRG(value);
    } else if (name === 'farmQuantity') {
      finalValue = value.replace(/\D/g, '');
    } else if (name === 'agency') {
      finalValue = value.replace(/\D/g, '').substring(0, 4);
    } else if (name === 'account') {
      finalValue = value.replace(/\D/g, '').substring(0, 13);
    }

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    clearFieldError(name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files, value } = e.target;
    if (files && files.length > 0) {
        setFilesToUpload(prev => ({
            ...prev,
            [name]: files[0]
        }));
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
    clearFieldError(name);
  };

  const handleCreditStatusChange = (val: string) => {
      setFormData(prev => ({
          ...prev,
          creditStatus: val as CreditStatus,
          creditLimitAvailable: val === 'Reprovado' ? '0' : prev.creditLimitAvailable
      }));
  };

  const handleConvertToClient = () => {
    if (readOnly && onEdit) {
        onEdit();
    }
    setFormData(prev => ({
        ...prev,
        registrationType: 'CLIENTE',
        type: 'Cliente',
        status: ClientStatus.READY_FOR_DATASUL
    }));
    showNotification("Modo de conversão ativado! Preencha os campos obrigatórios para concluir.", "success");
  };

  useEffect(() => {
    const cleanCep = cleanDigits(formData.zipCode);
    if (cleanCep.length === 8 && isFormOpen && !isFieldLocked('address')) {
      const performCepLookup = async () => {
        try {
          const data = await fetchCepData(cleanCep);
          if (data) {
            setFormData(prev => ({
              ...prev,
              address: isFieldLocked('address') ? prev.address : data.street,
              district: isFieldLocked('district') ? prev.district : data.neighborhood,
              city: isFieldLocked('city') ? prev.city : data.city,
              state: isFieldLocked('state') ? prev.state : data.state,
            }));
          } else {
            showNotification(`CEP principal ${formData.zipCode} não encontrado.`, 'error');
          }
        } catch (error) {
          showNotification(`Erro ao consultar o CEP ${formData.zipCode}.`, 'error');
        }
      };
      performCepLookup();
    }
  }, [formData.zipCode, isFormOpen]);

  useEffect(() => {
    const cleanCepCob = cleanDigits(formData.zipCodeCob);
    if (cleanCepCob.length === 8 && isFormOpen && !isFieldLocked('addressCob')) {
      const performCepCobLookup = async () => {
        try {
          const data = await fetchCepData(cleanCepCob);
          if (data) {
            setFormData(prev => {
              const addressAlreadyPopulated = prev.addressCob && prev.addressCob.trim().length > 0;
              return {
                ...prev,
                addressCob: (isFieldLocked('addressCob') || addressAlreadyPopulated) ? prev.addressCob : data.street,
                districtCob: (isFieldLocked('districtCob') || prev.districtCob) ? prev.districtCob : data.neighborhood,
                cityCob: (isFieldLocked('cityCob') || prev.cityCob) ? prev.cityCob : data.city,
                stateCob: (isFieldLocked('stateCob') || prev.stateCob) ? prev.stateCob : data.state,
              };
            });
          } else {
            showNotification(`CEP de cobrança ${formData.zipCodeCob} não encontrado.`, 'error');
          }
        } catch (error) {
          showNotification(`Erro ao buscar o CEP de cobrança ${formData.zipCodeCob}.`, 'error');
        }
      };
      performCepCobLookup();
    }
  }, [formData.zipCodeCob, isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || globalReadOnly) return;
    if (isFieldLocked('alias')) return;
    if (formData.alias && formData.alias.trim() !== '') return;

    const rawDoc = cleanDigits(formData.document);
    if (formData.name && rawDoc.length >= 2) {
        const suffix = rawDoc.slice(-2);
        const maxNameLen = 10;
        const cleanName = formData.name.trim().toUpperCase();
        const namePart = cleanName.substring(0, maxNameLen);
        const generatedAlias = `${namePart}${suffix}`;
        setFormData(prev => ({ ...prev, alias: generatedAlias }));
        clearFieldError('alias');
    }
  }, [formData.name, formData.document, isFormOpen]);

  useEffect(() => {
      setFormData(prev => ({
          ...prev,
          clientGroupCode: prev.supplierGroupCode
      }));
  }, [formData.supplierGroupCode]);

  useEffect(() => {
      if (isFieldLocked('identification')) return;

      const hasConsultoria = formData.activeServices.includes('Consultoria');
      const hasAssessoria = formData.activeServices.includes('Assessoria');
      const hasDiversos = formData.activeServices.includes('Fornecedores Diversos');
      const hasClientService = hasConsultoria || hasAssessoria;

      let newIdentification = '';
      if (hasComercializacao) {
          newIdentification = '3 - Ambos';
      } else if (hasClientService && hasDiversos) {
          newIdentification = '3 - Ambos';
      } else if (hasClientService) {
          newIdentification = '1 - Cliente';
      } else if (hasDiversos) {
          newIdentification = '2 - Fornecedor';
      }

      if (newIdentification && formData.identification !== newIdentification) {
          setFormData(prev => ({ ...prev, identification: newIdentification }));
          if (fieldErrors.identification) {
              setFieldErrors(prev => {
                  const newErrs = { ...prev };
                  delete newErrs.identification;
                  return newErrs;
              });
          }
      }
  }, [formData.activeServices, formData.identification, hasComercializacao]);

  useEffect(() => {
    if (isLead) {
        if (formData.type !== 'Lead') {
            setFormData(prev => ({ ...prev, type: 'Lead' }));
            clearFieldError('type');
        }
        return;
    }
    if (isExistingRecord && (initialData?.type === 'Lead' || initialData?.type === 'LEAD') && (formData.type === 'Lead' || formData.type === 'LEAD')) {
        return;
    }
    let derivedType = '';
    switch (formData.identification) {
        case '1 - Cliente': derivedType = 'Cliente'; break;
        case '2 - Fornecedor': derivedType = 'Fornecedor'; break;
        case '3 - Ambos': derivedType = 'Cliente/Fornecedor'; break;
    }
    if (derivedType && formData.type !== derivedType) {
        setFormData(prev => ({ ...prev, type: derivedType }));
        clearFieldError('type');
    }
  }, [formData.identification, formData.status, isExistingRecord, initialData]);

  useEffect(() => {
    if (formData.docType === 'CPF' && isFormOpen && !globalReadOnly) {
      setFormData((prev) => ({
        ...prev,
        docCob: isFieldLocked('docCob') ? prev.docCob : prev.document,
        nameCob: isFieldLocked('nameCob') ? prev.nameCob : prev.name,
        tradeName: isFieldLocked('tradeName') ? prev.tradeName : prev.name,
        addressCob: isFieldLocked('addressCob') ? prev.addressCob : formatFullAddress(prev.address, prev.number),
        zipCodeCob: isFieldLocked('zipCodeCob') ? prev.zipCodeCob : prev.zipCode,
        number: isFieldLocked('number') ? prev.number : prev.number,
        districtCob: isFieldLocked('districtCob') ? prev.districtCob : prev.district,
        cityCob: isFieldLocked('cityCob') ? prev.cityCob : prev.city,
        stateCob: isFieldLocked('stateCob') ? prev.stateCob : prev.state,
      }));
    }
  }, [
    formData.docType, formData.document, formData.name, formData.address, formData.zipCode,
    formData.district, formData.city, formData.state, formData.number, isFormOpen, globalReadOnly
  ]);

  const handleConsultarOrStart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setNotification(null);
    clearFieldError('document');
    setSlaveLaborResult(null);
    const rawDoc = cleanDigits(formData.document);

    if (isLead && rawDoc.length === 0) {
        setIsFormOpen(true);
        return;
    }

    if (formData.docType === 'CNPJ' && rawDoc.length !== 14) {
         setFieldErrors(prev => ({...prev, document: 'CNPJ inválido (deve conter 14 dígitos)'}));
         showNotification("Por favor, digite um CNPJ válido com 14 dígitos antes de prosseguir.", 'error');
         return;
    }

    if (formData.docType === 'CPF' && rawDoc.length !== 11) {
         setFieldErrors(prev => ({...prev, document: 'CPF inválido (deve conter 11 dígitos)'}));
         showNotification("Por favor, digite um CPF válido com 11 dígitos antes de prosseguir.", 'error');
         return;
    }

    setValidatingSlaveLabor(true);
    setLoadingCnpj(true);
    try {
        const isDirty = await checkSlaveLaborList(rawDoc);
        setSlaveLaborResult(isDirty ? 'dirty' : 'clean');

        let data = null;
        if (formData.docType === 'CNPJ') {
             data = await fetchCnpjData(rawDoc);
        }

        const baseNewValues: Partial<ClientData> = {
            trabalhoEscravo: isDirty
        };

        if (data) {
            const apiValues: Partial<ClientData> = {
                name: data.razao_social || '',
                tradeName: data.nome_fantasia || data.razao_social || '',
                address: data.logradouro || '',
                number: data.numero || '',
                district: data.bairro || '',
                city: data.municipio || '',
                state: data.uf || '',
                zipCode: formatCEP(data.cep || ''),
                nature: '2 - Pessoa Jurídica',
            };
            const identificador = Number(data.identificador_matriz_filial);
            if (identificador === 1) {
                const cobValues = {
                    docCob: formatCNPJ(data.cnpj || ''),
                    nameCob: data.razao_social || '',
                    zipCodeCob: formatCEP(data.cep || ''),
                    addressCob: formatFullAddress(data.logradouro, data.numero, data.descricao_tipo_de_logradouro),
                    districtCob: data.bairro || '',
                    cityCob: data.municipio || '',
                    stateCob: data.uf || '',
                    ieCob: '',
                };
                setFormData((prev) => ({ ...prev, ...baseNewValues, ...apiValues, ...cobValues }));
            } else {
                setFormData((prev) => ({ ...prev, ...baseNewValues, ...apiValues }));
                setLoadingCob(true);
                const matrizCnpj = generateMatrizCnpj(data.cnpj);
                try {
                    if (cleanDigits(matrizCnpj) !== rawDoc) {
                        const matrizData = await fetchCnpjData(matrizCnpj);
                        if (matrizData) {
                            const updateData = {
                                docCob: formatCNPJ(matrizData.cnpj || ''),
                                nameCob: matrizData.razao_social || '',
                                zipCodeCob: formatCEP(matrizData.cep || ''),
                                addressCob: formatFullAddress(matrizData.logradouro, matrizData.numero, matrizData.descricao_tipo_de_logradouro),
                                districtCob: matrizData.bairro || '',
                                cityCob: matrizData.municipio || '',
                                stateCob: matrizData.uf || '',
                            };
                            setFormData((prev) => ({ ...prev, ...updateData }));
                            showNotification("Cadastro de Filial: Dados da Matriz buscados automaticamente para Cobrança.", 'success');
                        } else {
                             showNotification(`Filial identificada, mas não foi possível obter dados automáticos da Matriz (${formatCNPJ(matrizCnpj)}). Preencha a cobrança manualmente.`, 'warning');
                        }
                    }
                } catch (err) {
                    console.error("Erro ao buscar matriz:", err);
                    showNotification('Erro ao buscar dados da Matriz. Preencha a cobrança manualmente.', 'warning');
                } finally {
                    setLoadingCob(false);
                }
            }
        } else {
            setFormData(prev => ({ ...prev, ...baseNewValues }));
            if (formData.docType === 'CNPJ') {
                showNotification("CNPJ não encontrado na base de dados ou erro na API.", 'error');
            }
        }

        if (isDirty) {
             if (formData.activeServices.includes('Comercialização')) {
                 setShowSlaveLaborModal(true);
             } else {
                 showNotification("ATENÇÃO: Este documento consta na Lista Suja do Trabalho Escravo.", 'warning');
             }
        }

        setIsFormOpen(true);
        setLoadingCnpj(false);
        setValidatingSlaveLabor(false);
    } catch (error: any) {
        console.error(error);
        setLoadingCnpj(false);
        setValidatingSlaveLabor(false);
        setLoadingCob(false);
        showNotification(error?.message || "Erro ao realizar validações.", 'error');
        setIsFormOpen(true);
    }
  };

  const handleAddService = async (service: RegistrationCategory) => {
      if (formData.activeServices.includes(service)) return;
      const newActiveServices = [...formData.activeServices, service];
      const updatedData = { ...formData, activeServices: newActiveServices, category: service };

      setFormData(updatedData);
      setIsAddingService(false);

      if (isExistingRecord) {
          setIsUploading(true);
          setUploadProgress(`Adicionando serviço: ${service}...`);
          try {
              await onSave(updatedData, undefined, { skipViewChange: true });
              showNotification(`Serviço '${service}' adicionado com sucesso!`, 'success');
              setHasAddedNewService(false);
          } catch (err: any) {
              console.error("Erro ao adicionar serviço:", err);
              showNotification(`Erro ao adicionar serviço: ${err.message}`, 'error');
          } finally {
              setIsUploading(false);
              setUploadProgress('');
          }
      } else {
          setHasAddedNewService(true);
          showNotification(`Serviço '${service}' adicionado ao rascunho.`, 'success');
      }
  };

  const handleRemoveService = async (e: React.MouseEvent, serviceToRemove: RegistrationCategory) => {
      e.stopPropagation();
      if (formData.activeServices.length <= 1) {
          showNotification("O cadastro deve possuir ao menos um serviço ativo.", 'warning');
          return;
      }
      if (isBlocked && serviceToRemove === 'Comercialização') {
          showNotification("Não é possível remover o serviço de Comercialização pois ele está bloqueado.", 'error');
          return;
      }

      const newServices = formData.activeServices.filter(s => s !== serviceToRemove);
      let newCategory = formData.category;
      if (formData.category === serviceToRemove) {
          newCategory = newServices[0];
      }

      const updatedData = { ...formData, activeServices: newServices, category: newCategory };
      setFormData(updatedData);

      if (isExistingRecord) {
          setIsUploading(true);
          setUploadProgress(`Removendo serviço: ${serviceToRemove}...`);
          try {
              await onSave(updatedData, undefined, { skipViewChange: true });
              showNotification(`Serviço '${serviceToRemove}' removido com sucesso!`, 'success');
              if (initialData?.activeServices.includes(serviceToRemove) === false) {
                  const stillHasNew = newServices.some(s => !initialData?.activeServices.includes(s));
                  setHasAddedNewService(stillHasNew);
              }
          } catch (err: any) {
              console.error("Erro ao remover serviço:", err);
              showNotification(`Erro ao remover serviço: ${err.message}`, 'error');
          } finally {
              setIsUploading(false);
              setUploadProgress('');
          }
      } else {
          const stillHasNew = newServices.some(s => !initialData?.activeServices.includes(s));
          setHasAddedNewService(stillHasNew);
      }
  };

  const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};
      const requiredMsg = "Campo obrigatório";
      const isSlaveLaborEdit = !isNew && !isOriginallyLead && formData.trabalhoEscravo;

      if (!formData.name?.trim()) newErrors.name = requiredMsg;

      const isDocumentRequired = !isLead || (isLead && formData.requiresCreditAnalysis);
      if (isDocumentRequired) {
        if (!formData.document?.trim()) newErrors.document = requiredMsg;
      }

      if (!isLead) {
          if (!formData.tradeName?.trim()) newErrors.tradeName = requiredMsg;
          if (!formData.alias?.trim()) newErrors.alias = requiredMsg;
          if (!formData.zipCode?.trim()) newErrors.zipCode = requiredMsg;
          if (!formData.address?.trim()) newErrors.address = requiredMsg;
          if (!formData.district?.trim()) newErrors.district = requiredMsg;
          if (!formData.city?.trim()) newErrors.city = requiredMsg;
          if (!formData.state?.trim()) newErrors.state = requiredMsg;
          if (!formData.country?.trim()) newErrors.country = requiredMsg;
          if (!formData.ie?.trim()) newErrors.ie = requiredMsg;
          if (!formData.supplierGroupCode?.trim()) newErrors.supplierGroupCode = requiredMsg;
          if (!formData.identification?.trim()) newErrors.identification = requiredMsg;
          if (formData.docType === 'CPF' && !formData.rg?.trim()) newErrors.rg = requiredMsg;
          if (!formData.docCob?.trim()) newErrors.docCob = requiredMsg;
          if (!formData.nameCob?.trim()) newErrors.nameCob = requiredMsg;
          if (!formData.zipCodeCob?.trim()) newErrors.zipCodeCob = requiredMsg;
          if (!formData.addressCob?.trim()) newErrors.addressCob = requiredMsg;
          if (!formData.districtCob?.trim()) newErrors.districtCob = requiredMsg;
          if (!formData.cityCob?.trim()) newErrors.cityCob = requiredMsg;
          if (!formData.stateCob?.trim()) newErrors.stateCob = requiredMsg;
          if (!formData.ieCob?.trim()) newErrors.ieCob = requiredMsg;
          if (isEconomicGroupRequired) {
              if (!formData.economicGroup?.trim()) newErrors.economicGroup = requiredMsg;
          }
      }

      if (formData.requiresCreditAnalysis) {
          if (!isBlocked && !isSlaveLaborEdit) {
             if (!formData.financialStatementFile?.trim() && !filesToUpload.financialStatementFile) newErrors.financialStatementFile = requiredMsg;
             if (!formData.taxReturnFile?.trim() && !filesToUpload.taxReturnFile) newErrors.taxReturnFile = requiredMsg;
             if (!formData.commercialOpinion?.trim()) newErrors.commercialOpinion = requiredMsg;
          }
      }

      if (isCreditRisk) {
          if (formData.creditStatus === 'Reprovado' && !formData.creditOpinion?.trim()) newErrors.creditOpinion = requiredMsg;
      }
      setFieldErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
          const agroFields = ['plantedAreaSize', 'farmQuantity', 'origin', 'type', 'crops', 'car', 'matricula', 'contacts', 'bankProofUrl'];
          const hasAgroError = Object.keys(newErrors).some(k => agroFields.includes(k));
          if (hasAgroError && formData.category !== 'Comercialização' && hasComercializacao) {
               setFormData(prev => ({...prev, category: 'Comercialização'}));
               showNotification("Existem pendências obrigatórias nos dados de Comercialização.", 'warning');
          } else {
               showNotification("Para prosseguir, preencha todos os campos obrigatórios.", 'error');
          }
          return false;
      }
      return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsUploading(true);
    let updatedData = { ...formData };

    try {
        if (isExistingRecord) {
            const storageId = updatedData.id;
            const uploadPromises = Object.entries(filesToUpload).map(async ([field, file]) => {
                const docTypeFolder = DOC_FOLDER_MAP[field];
                if (!docTypeFolder) return;
                setUploadProgress(`Enviando ${field}...`);
                const path = await uploadDocument(file as File, storageId, docTypeFolder);
                (updatedData as any)[field] = path;
            });
            if (uploadPromises.length > 0) {
                setUploadProgress('Finalizando uploads...');
                await Promise.all(uploadPromises);
            }
            await onSave(updatedData);
            setHasAddedNewService(false);
        } else {
            if (isOperations) {
                updatedData.status = ClientStatus.COMPLETED;
            } else {
                if (updatedData.registrationType === 'LEAD') {
                   updatedData.status = ClientStatus.LEAD;
                } else {
                   updatedData.status = ClientStatus.READY_FOR_DATASUL;
                }
                if (updatedData.requiresCreditAnalysis) {
                    updatedData.creditStatus = 'Pendente';
                }
            }
            await onSave(updatedData, filesToUpload);
        }
    } catch (err: any) {
        console.error("[ClientForm] Erro ao processar formulário:", err);
        if (err.code === '23505' || (err.message && (err.message.includes('duplicate key') || err.message.includes('ux_cadastro_dup_alias_doc_ie')))) {
             showNotification('Erro: Duplicidade detectada. Já existe um cadastro com este CNPJ/CPF, Inscrição Estadual ou Apelido.', 'error');
        } else {
             showNotification(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`, 'error');
        }
    } finally {
        setIsUploading(false);
        setUploadProgress('');
    }
  };

  const handleSaveNewGroup = async () => {
    if (!newGroupData.name.trim()) return;
    const newName = newGroupData.name.trim();

    try {
      const { data, error } = await supabase
        .from('grupo_economico')
        .insert({
          name: newName,
          obs: newGroupData.observation
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({...prev, economicGroup: data.id}));
        setSelectedGroupName(data.name);
        clearFieldError('economicGroup');
        setIsAddingNewGroup(false);
        setIsEconomicGroupModalOpen(false);
        setNewGroupData({ name: '', observation: '' });
        setEconomicGroupSearch('');
        showNotification("Grupo econômico criado e selecionado com sucesso.", "success");
      }
    } catch (err: any) {
      if (err.code === '23505' || (err.message && err.message.includes('ux_grupo_economico_name_norm_unique'))) {
        showNotification("Grupo econômico já cadastrado. Não é possível realizar cadastrados duplicados.", "error");
      } else {
        showNotification(`Erro ao criar grupo econômico: ${err.message}`, "error");
      }
    }
  };

  const getStartButtonText = () => {
      if (loadingCnpj && validatingSlaveLabor) return 'Buscando CNPJ & Lista...';
      if (validatingSlaveLabor) return 'Validating Lista...';
      if (loadingCnpj) return 'Consultando CNPJ...';
      if (loadingCob) return 'Buscando Matriz...';
      return 'Realizar Validação';
  };

  const getButtonColor = () => {
      if (isOperations) return 'bg-orange-600 hover:bg-orange-700';
      if (isCreditRisk) return 'bg-indigo-600 hover:bg-indigo-700';
      return 'bg-[#3AE4B0] hover:opacity-90';
  };

  const showNotification = (message: string, type: 'error' | 'warning' | 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 8000);
  };

  const userAllowedCategories = ALL_CATEGORIES.filter(cat => {
      if (roles.includes(Role.OPERATIONS)) return true;
      const requiredRole = categoryToRole[cat];
      return roles.includes(requiredRole);
  });

  const unselectedServices = ALL_CATEGORIES.filter(cat => !formData.activeServices.includes(cat) && userAllowedCategories.includes(cat));

  const identificationLocked = true;
  // MODIFICADO: Agora os resultados de crédito só aparecem se a solicitação for TRUE
  const showCreditResults = isFormOpen && formData.category !== 'Fornecedores Diversos' && formData.requiresCreditAnalysis;

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg border border-gray-200 relative overflow-visible">
      {notification && (
        <div className={`fixed top-6 right-6 z-[70] max-w-md w-full p-4 rounded-lg shadow-2xl border-l-4 bg-white transition-all transform duration-300 ease-in-out
            ${notification.type === 'error' ? 'border-red-500' : notification.type === 'warning' ? 'border-yellow-500' : 'border-green-500'}
        `}>
          <div className="flex justify-between items-start">
             <div className="flex gap-3">
                 <div className={`text-2xl ${notification.type === 'error' ? 'text-red-500' : notification.type === 'warning' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {notification.type === 'error' ? '🚫' : notification.type === 'warning' ? '⚠️' : '✅'}
                 </div>
                 <div>
                    <h4 className={`font-bold text-sm ${notification.type === 'error' ? 'text-red-800' : notification.type === 'warning' ? 'text-yellow-800' : 'text-green-800'}`}>
                        {notification.type === 'error' ? 'Ação Necessária' : notification.type === 'warning' ? 'Atenção' : 'Sucesso'}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1 leading-snug">{notification.message}</p>
                 </div>
             </div>
             <button type="button" onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 p-1">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>
        </div>
      )}

      {showSlaveLaborModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 border-red-600 animate-bounce-in">
                  <div className="p-8 text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                          <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Restrição Identificada</h3>
                      <p className="text-gray-600 mt-4 leading-relaxed">
                          O documento informado consta na <strong className="text-red-600 uppercase">Lista Suja do Trabalho Escravo</strong>.
                          <br/><br/>
                          O cadastro poderá ser realizado, mas estará sujeito a bloqueios automáticos de compliance para comercialização.
                      </p>
                      <div className="mt-8">
                        <button type="button" onClick={() => setShowSlaveLaborModal(false)} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-lg">
                            Entendido
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center sticky top-[72px] z-[40] shadow-md transition-all duration-300 rounded-t-lg">
        <div className="flex flex-col">
           <div className="flex items-center gap-2 mb-1">
               <h2 className="text-xl font-bold text-gray-800">
                 {isExistingRecord ? (globalReadOnly && !hasAddedNewService ? 'Visualizar Cadastro' : 'Editar Cadastro') : 'Novo Cliente/Lead'}
                 {isNew && <span className="ml-3 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-black border border-blue-200">Novo Registro</span>}
               </h2>
           </div>

           <div className="flex items-center gap-2 mt-2 flex-wrap">
               {formData.activeServices.map(service => {
                   const isThisServiceBlocked = isBlocked && service === 'Comercialização';
                   const userCanManage = canUserManageService(service);
                   return (
                   <button
                        key={service}
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, category: service}))}
                        className={`pl-3 pr-2 py-1 text-xs font-bold rounded-full border transition-all flex items-center gap-1 group ${
                            formData.category === service
                            ? (isThisServiceBlocked ? 'bg-red-600 text-white border-red-600' : 'bg-[#3AE4B0] text-white border-[#3AE4B0]') + ' shadow-sm'
                            : (isThisServiceBlocked ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100')
                        }`}
                   >
                       {isThisServiceBlocked && <span className="text-[10px] mr-0.5">⚠️</span>}
                       {service}
                       {formData.category === service && <span className="bg-white/20 rounded-full w-2 h-2 ml-1"></span>}
                       {userCanManage && formData.activeServices.length > 1 && (
                            <span onClick={(e) => handleRemoveService(e, service)} className={`ml-1 p-0.5 rounded-full hover:bg-red-500 hover:text-white transition-colors ${formData.category === service ? 'text-white/70 hover:bg-white/30' : 'text-gray-400'}`} title={isThisServiceBlocked ? "Este serviço está bloqueado e não pode ser removido" : "Remover este serviço"}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </span>
                       )}
                   </button>
                   );
               })}
               {unselectedServices.length > 0 && (
                   <div className="relative">
                       <button type="button" onClick={() => setIsAddingService(!isAddingService)} className="px-2 py-1 text-xs font-bold rounded-full border border-dashed border-gray-400 text-gray-500 hover:text-[#3AE4B0] hover:border-[#3AE4B0] transition-colors flex items-center gap-1">
                           + Add Produto
                       </button>
                       {isAddingService && (
                           <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                               {unselectedServices.map(service => (
                                   <button key={service} type="button" onClick={() => handleAddService(service)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700">
                                       {service}
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>
               )}
           </div>
        </div>

        <div className="flex gap-2 items-center">
          {canUserConvertLead() && (
             <button type="button" onClick={handleConvertToClient} className="px-4 py-2 text-xs font-bold text-white bg-purple-600 border border-purple-700 rounded hover:bg-purple-700 transition-colors mr-2 shadow-sm animate-pulse-slow">
                 ⚡ Converter para Cliente
             </button>
          )}

          {canShowEditButton() && (
              <button type="button" onClick={onEdit} className="px-4 py-2 text-xs font-bold text-white bg-[#3AE4B0] border border-[#34ce9f] rounded hover:opacity-90 transition-opacity mr-2 flex items-center gap-1 shadow-sm">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                  Editar Cadastro
              </button>
          )}

          {isExistingRecord && onAddIE && formData.type !== 'Lead' && isEligibleClientTypeForIE && canCreateNewIEByRole && (
              <button type="button" onClick={() => onAddIE(formData)} className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors mr-2">
                  + Nova Inscrição Estadual
              </button>
          )}
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded">
            {globalReadOnly && !hasAddedNewService ? 'Voltar' : 'Cancelar'}
          </button>
          {isFormOpen && (!globalReadOnly || hasAddedNewService) && (
            <button type="submit" disabled={isUploading} className={`px-6 py-2 text-sm text-white font-bold rounded shadow-sm ${getButtonColor()} ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
                {isOperations ? 'Salvar Código & Concluir' : isCreditRisk ? 'Salvar Análise' : 'Salvar & Enviar'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {!isExistingRecord && (
            <div className="flex justify-center mb-6">
                <div className="bg-gray-100 p-1 rounded-lg flex shadow-inner">
                    <button type="button" onClick={() => { setFormData(prev => ({...prev, registrationType: 'CLIENTE', status: ClientStatus.READY_FOR_DATASUL})); setFieldErrors({}); }} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${formData.registrationType === 'CLIENTE' ? 'bg-white text-[#3AE4B0] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Cliente Completo
                    </button>
                    <button type="button" onClick={() => { setFormData(prev => ({...prev, registrationType: 'LEAD', status: ClientStatus.LEAD})); setFieldErrors({}); }} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${formData.registrationType === 'LEAD' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Lead (Simplificado)
                    </button>
                </div>
            </div>
        )}

        {(isOperations || formData.registryCode) && (
            <section className={`p-4 rounded-lg border-2 ${isOperations ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'} animate-fade-in`}>
                 <div className={`flex justify-between items-center border-b pb-2 mb-4 ${isOperations ? 'border-orange-200' : 'border-gray-200'}`}>
                     <h3 className={`text-lg font-bold ${isOperations ? 'text-orange-900' : 'text-gray-700'}`}>Integração Datasul</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-1">
                        <FormInput label="Código do Cadastro (Datasul)" name="registryCode" value={formData.registryCode} onChange={handleInputChange} disabled={isFieldLocked('registryCode')} requiredMark={false} error={fieldErrors.registryCode} placeholder="Digite o código gerado no ERP..." className={isFieldLocked('registryCode') ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300' : 'bg-white ring-2 ring-orange-300 focus:ring-orange-500'} />
                     </div>
                 </div>
            </section>
        )}

        <section>
          <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="text-lg font-bold text-gray-800">Dados Gerais</h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Editando contexto: <strong>{formData.category}</strong>
                  {isComercializacaoBlocked && (
                      <span className="ml-2 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10px]">BLOQUEADO</span>
                  )}
              </div>
          </div>

          {isFormOpen && formData.category !== 'Fornecedores Diversos' && (
            <div className={`mb-6 p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4 border ${isComercializacaoBlocked ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-[#7D8D6D] border-[#7D8D6D]'}`}>
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="requiresCreditAnalysis" name="requiresCreditAnalysis" checked={formData.requiresCreditAnalysis} onChange={(e) => setFormData(prev => ({...prev, requiresCreditAnalysis: e.target.checked}))} disabled={isFieldLocked('requiresCreditAnalysis')} className="w-5 h-5 text-[#3AE4B0] rounded focus:ring-[#3AE4B0]" />
                    <label htmlFor="requiresCreditAnalysis" className={`font-bold select-none ${isComercializacaoBlocked ? 'text-gray-500' : 'text-white'} ${isFieldLocked('requiresCreditAnalysis') ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                        Realizar cadastro com análise de crédito
                    </label>
                 </div>
                 {formData.requiresCreditAnalysis && (
                     <span className={`text-xs px-2 py-1 rounded font-bold ${isComercializacaoBlocked ? 'bg-gray-200 text-gray-600' : 'bg-white text-[#7D8D6D]'}`}>Campos adicionais habilitados</span>
                 )}
            </div>
          )}

          {showCreditResults && (
             <div className={`mb-6 p-4 rounded-lg border-2 ${isCreditRisk ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200'} animate-fade-in`}>
                 <div className="flex justify-between items-center border-b border-indigo-200 pb-2 mb-4">
                     <h3 className="text-lg font-bold text-indigo-900">Análise de Crédito e Risco</h3>
                     {isCreditRisk && <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded">Área Exclusiva</span>}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                         <div className="flex flex-col">
                             <label className="text-sm font-bold text-gray-700 block mb-1">Status da Análise</label>
                             <select name="status_credito_ui" value={formData.creditStatus} onChange={(e) => handleCreditStatusChange(e.target.value)} disabled={isFieldLocked('creditStatus')} className={`w-full border rounded p-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formData.creditStatus === 'Aprovado' ? 'bg-green-50 text-green-800 border-green-300' : formData.creditStatus === 'Reprovado' ? 'bg-red-50 text-red-800 border-red-300' : formData.creditStatus === 'Em Análise' ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-white'}`}>
                                 <option value="Pendente">Pendente</option>
                                 <option value="Em Análise">Em Análise</option>
                                 <option value="Aprovado">Aprovado</option>
                                 <option value="Reprovado">Reprovado</option>
                             </select>
                         </div>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1"><FormInput label="Score" name="creditScore" value={formData.creditScore} onChange={handleInputChange} disabled={isFieldLocked('creditScore')} /></div>
                        <div className="md:col-span-1"><FormInput label="Limite Solicitado" name="creditLimitRequested" value={formData.creditLimitRequested} onChange={handleInputChange} disabled={isFieldLocked('creditLimitRequested')} /></div>
                        <div className="md:col-span-1"><FormInput label="Limite Disponibilizado" name="creditLimitAvailable" value={formData.creditLimitAvailable} onChange={handleInputChange} disabled={isFieldLocked('creditLimitAvailable')} className={isFieldLocked('creditLimitAvailable') ? 'bg-gray-200' : ''} /></div>
                    </div>
                    {(formData.creditStatus === 'Reprovado' || isCreditRisk) && (
                        <div className="md:col-span-4">
                            <label className={`text-sm font-semibold mb-1 block ${fieldErrors.creditOpinion ? 'text-red-600' : 'text-gray-700'}`}>Parecer de Crédito {formData.creditStatus === 'Reprovado' && <span className="text-red-500">*</span>}</label>
                            <textarea name="creditOpinion" value={formData.creditOpinion} onChange={handleInputChange} disabled={isFieldLocked('creditOpinion')} rows={3} className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${fieldErrors.creditOpinion ? 'border-red-500 bg-red-50 focus:ring-red-500 text-red-900 placeholder-red-300' : isFieldLocked('creditOpinion') ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-300 focus:ring-indigo-500'} `} placeholder="Justificativa da análise..." />
                            {fieldErrors.creditOpinion && <span className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.creditOpinion}</span>}
                        </div>
                    )}
                 </div>
             </div>
          )}

          {isFormOpen && formData.category !== 'Fornecedores Diversos' && formData.requiresCreditAnalysis && (
             <div className={`mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border ${isComercializacaoBlocked ? 'bg-gray-100 border-gray-300' : 'bg-[#7D8D6D] border-[#7D8D6D]'}`}>
                  <div className="md:col-span-3 pb-2 border-b border-white/30 mb-2"><h4 className={`text-sm font-bold ${isComercializacaoBlocked ? 'text-gray-600' : 'text-white'}`}>Documentação para Crédito</h4></div>
                  <div className="md:col-span-1"><AttachmentField label="Demonstrativo Financeiro (Anexo)" field="financialStatementFile" requiredMark={!isBlocked} error={fieldErrors.financialStatementFile} labelClassName={isComercializacaoBlocked ? 'text-gray-600' : 'text-white'} inputClassName="file:bg-white file:text-[#7D8D6D] hover:file:bg-gray-100" /></div>
                  <div className="md:col-span-1"><AttachmentField label="Imposto de Renda (Anexo)" field="taxReturnFile" requiredMark={!isBlocked} error={fieldErrors.taxReturnFile} labelClassName={isComercializacaoBlocked ? 'text-gray-600' : 'text-white'} inputClassName="file:bg-white file:text-[#7D8D6D] hover:file:bg-gray-100" /></div>
                  <div className="md:col-span-3">
                      <label className={`text-sm font-semibold mb-1 block ${fieldErrors.commercialOpinion ? 'text-red-300' : (isComercializacaoBlocked ? 'text-gray-600' : 'text-white')}`}>Parecer Comercial <span className="text-red-300">*</span></label>
                      <textarea name="commercialOpinion" value={formData.commercialOpinion} onChange={handleInputChange} disabled={isFieldLocked('commercialOpinion')} rows={3} className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${fieldErrors.commercialOpinion ? 'border-red-500 bg-red-50 focus:ring-red-500 text-red-900 placeholder-red-300' : isFieldLocked('commercialOpinion') ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-300 focus:ring-[#3AE4B0]'} `} placeholder="Descreva o potencial do cliente, justificativa para crédito, etc." />
                      {fieldErrors.commercialOpinion && <span className="text-xs text-red-300 font-semibold mt-1">{fieldErrors.commercialOpinion}</span>}
                  </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             <div className="md:col-span-1">
                <div className="flex flex-col mb-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Tipo Documento</label>
                  <select name="docType" value={formData.docType} onChange={(e) => { const val = e.target.value; handleInputChange(e); setFormData(prev => { const updated = { ...prev }; if (val === 'CNPJ') { updated.civilStatus = 'Outros'; } if (!isExistingRecord) { updated.document = ''; updated.nature = val === 'CPF' ? '1 - Pessoa Física' : '2 - Pessoa Jurídica'; } return updated; }); if (!isExistingRecord) { if (!isLead) { setIsFormOpen(false); } setFieldErrors({}); } }} disabled={isFieldLocked('docType')} className="w-full border rounded p-2 text-sm bg-white border-gray-300" > <option value="CNPJ">CNPJ</option> <option value="CPF">CPF</option> </select>
                </div>
             </div>
             <div className="md:col-span-1">
                <div className="relative">
                    <FormInput label="Documento (CNPJ/CPF)" name="document" value={formData.document} maxLength={19} error={fieldErrors.document} onChange={(e) => { const val = cleanDigits(e.target.value); const formatted = formData.docType === 'CNPJ' ? formatCNPJ(val) : formatCPF(val); setFormData(prev => ({...prev, document: formatted})); clearFieldError('document'); if (slaveLaborResult) setSlaveLaborResult(null); }} placeholder={formData.docType === 'CNPJ' ? '00.000.000/0000-00' : '00.000.000-00'} disabled={isFieldLocked('document')} className="mb-0" />
                    {slaveLaborResult && (
                        <div className={`absolute right-0 top-0 -mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border ${slaveLaborResult === 'dirty' ? 'bg-red-600 text-white border-red-700 animate-pulse' : 'bg-green-100 text-green-700 border-green-200'}`}>
                            {slaveLaborResult === 'dirty' ? '⚠️ Lista Suja' : '✅ Nada Consta'}
                        </div>
                    )}
                </div>
             </div>
             {!isFormOpen && (
                 <div className="md:col-span-2 pb-4 flex gap-3">
                    <button type="button" onClick={handleConsultarOrStart} disabled={loadingCnpj || validatingSlaveLabor || loadingCob} className={`flex-1 py-2 px-4 font-medium rounded shadow transition-colors flex items-center justify-center gap-2 ${loadingCnpj || validatingSlaveLabor || loadingCob ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-800' }`} > {(loadingCnpj || validatingSlaveLabor || loadingCob) && ( <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> )} {getStartButtonText()} </button>
                    {!isFormOpen && isLead && (
                        <button type="button" onClick={() => { setIsFormOpen(true); clearFieldError('document'); }} className="flex-1 py-2 px-2 font-medium rounded shadow transition-colors text-sm border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-center leading-tight"> Continuar sem CNPJ/CPF </button>
                    )}
                 </div>
             )}
             {isFormOpen && (isLead || isOriginallyLead || isNew) && (
                 <div className="md:col-span-1 mb-4">
                    <button type="button" onClick={handleConsultarOrStart} disabled={loadingCnpj || validatingSlaveLabor || loadingCob} className={`w-full py-2 px-3 font-bold text-xs rounded shadow transition-colors flex items-center justify-center gap-2 h-[38px] border ${loadingCnpj || validatingSlaveLabor || loadingCob ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300' }`} title="Consultar API e Validar Lista Suja" > {(loadingCnpj || validatingSlaveLabor || loadingCob) ? ( <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> ) : ( <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> )} Validar & Preencher </button>
                 </div>
             )}
             {isFormOpen && (
                 <>
                    <div className="md:col-span-2"><FormInput label="Nome / Razão Social" name="name" value={formData.name} onChange={handleInputChange} disabled={isFieldLocked('name')} requiredMark error={fieldErrors.name} maxLength={180} /></div>
                    <div className="md:col-span-2"><FormInput label="Nome Fantasia" name="tradeName" value={formData.tradeName} onChange={handleInputChange} disabled={isFieldLocked('tradeName')} requiredMark={!isLead} error={fieldErrors.tradeName} maxLength={12} /></div>
                    <div className="md:col-span-1"><FormInput label="Apelido" name="alias" value={formData.alias} onChange={handleInputChange} disabled={isFieldLocked('alias')} requiredMark={!isLead} error={fieldErrors.alias} maxLength={12} /></div>
                    <div className="md:col-span-1">
                         <div className="flex flex-col mb-4">
                            <label className="text-sm font-semibold text-gray-700 block mb-1">Natureza</label>
                            <select name="nature" value={formData.nature} onChange={handleInputChange} disabled={isFieldLocked('nature')} className="w-full border rounded p-2 text-sm bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3AE4B0]" >
                                <option value="1 - Pessoa Física">1 - Pessoa Física</option>
                                <option value="2 - Pessoa Jurídica">2 - Pessoa Jurídica</option>
                                <option value="3 - Estrangeiro">3 - Estrangeiro</option>
                                <option value="4 - Trading">4 - Trading</option>
                            </select>
                         </div>
                    </div>
                 </>
             )}
          </div>
        </section>

        {isFormOpen && (
        <>
            <section className="animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Endereço & Fiscal</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1"><FormInput label="CEP" name="zipCode" value={formData.zipCode} onChange={handleInputChange} disabled={isFieldLocked('zipCode')} requiredMark={!isLead} error={fieldErrors.zipCode} maxLength={9} /></div>
                <div className="md:col-span-2"><FormInput label="Endereço (Rua)" name="address" value={formData.address} onChange={handleInputChange} disabled={isFieldLocked('address')} requiredMark={!isLead} error={fieldErrors.address} maxLength={40} /></div>
                <div className="md:col-span-1"><FormInput label="Número" name="number" value={formData.number} onChange={handleInputChange} disabled={isFieldLocked('number')} /></div>
                <div className="md:col-span-1"><FormInput label="Bairro" name="district" value={formData.district} onChange={handleInputChange} disabled={isFieldLocked('district')} requiredMark={!isLead} error={fieldErrors.district} maxLength={30} /></div>
                <div className="md:col-span-1"><FormInput label="Cidade" name="city" value={formData.city} onChange={handleInputChange} disabled={isFieldLocked('city')} requiredMark={!isLead} error={fieldErrors.city} maxLength={50} /></div>
                <div className="md:col-span-1"><FormInput label="Estado (UF)" name="state" value={formData.state} onChange={handleInputChange} disabled={isFieldLocked('state')} requiredMark={!isLead} error={fieldErrors.state} maxLength={2} placeholder="UF" /></div>
                <div className="md:col-span-1"><FormInput label="País" name="country" value={formData.country} onChange={handleInputChange} disabled={isFieldLocked('country')} requiredMark={!isLead} error={fieldErrors.country} maxLength={20} /></div>
                <div className="md:col-span-1"><FormInput label="Inscrição Estadual" name="ie" value={formData.ie} onChange={handleInputChange} disabled={isFieldLocked('ie')} requiredMark={!isLead} error={fieldErrors.ie} maxLength={19} /></div>
                <>
                    <div className="md:col-span-1">
                        <div className="flex flex-col mb-4"><label className={`text-sm font-semibold mb-1 ${fieldErrors.supplierGroupCode ? 'text-red-600' : 'text-gray-700'}`}> Cód. Grupo Fornecedor <span className="text-red-500">*</span> </label><select name="supplierGroupCode" value={formData.supplierGroupCode} onChange={handleInputChange} disabled={isFieldLocked('supplierGroupCode')} className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${ isFieldLocked('supplierGroupCode') ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300' : fieldErrors.supplierGroupCode ? 'bg-red-50 border-red-500 focus:ring-red-500 text-red-900' : 'bg-white border-gray-300 focus:ring-[#3AE4B0]' }`} > <option value="">Selecione...</option> {SUPPLIER_GROUP_OPTIONS.map(opt => ( <option key={opt.code} value={opt.code}>{opt.label}</option> ))} </select>{fieldErrors.supplierGroupCode && <span className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.supplierGroupCode}</span>}</div>
                    </div>
                    <div className="md:col-span-1"><FormInput label="Cód. Grupo Cliente (Auto)" name="clientGroupCode" value={formData.clientGroupCode} readOnly disabled className="bg-gray-200 cursor-not-allowed" /></div>
                    <div className="md:col-span-1">
                         <div className="flex flex-col mb-4"><label className={`text-sm font-semibold mb-1 ${fieldErrors.identification ? 'text-red-600' : 'text-gray-700'}`}> Identificação <span className="text-red-500">*</span> </label><select name="identification" value={formData.identification} onChange={handleInputChange} disabled={identificationLocked} className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${ identificationLocked ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300' : fieldErrors.identification ? 'bg-red-50 border-red-500 focus:ring-red-500 text-red-900' : 'bg-white border-gray-300 focus:ring-[#3AE4B0]' }`} > <option value="">Selecione...</option> <option value="1 - Cliente">1 - Cliente</option> <option value="2 - Fornecedor">2 - Fornecedor</option> <option value="3 - Ambos">3 - Ambos</option> </select>{fieldErrors.identification && <span className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.identification}</span>}</div>
                    </div>
                </>
                <div className="md:col-span-1"><FormInput label="RG (PF)" name="rg" value={formData.rg} onChange={handleInputChange} disabled={isFieldLocked('rg')} requiredMark={formData.docType === 'CPF' && !isLead} error={fieldErrors.rg} maxLength={12} /></div>
                <div className="md:col-span-1">
                    <div className="flex flex-col mb-4"><label className="text-sm font-semibold text-gray-700 mb-1">Estado Civil</label><select name="civilStatus" value={formData.civilStatus} onChange={(e) => { handleInputChange(e as any); }} disabled={isFieldLocked('civilStatus')} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3AE4B0] transition-colors bg-white border-gray-300" > <option value="">Selecione...</option> <option value="Solteiro">Solteiro</option> <option value="Casado">Casado</option> <option value="Viúvo">Viúvo</option> <option value="Divorciado">Divorciado</option> <option value="Outros">Outros</option> </select></div>
                </div>
                <div className="md:col-span-1 relative">
                    <label className={`text-sm font-semibold mb-1 block ${fieldErrors.economicGroup ? 'text-red-600' : 'text-gray-700'}`}> Grupo Econômico {!isLead && isEconomicGroupRequired && <span className="text-red-500">*</span>} </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="economicGroup"
                            value={isUuid(formData.economicGroup) ? (selectedGroupName || 'Carregando...') : formData.economicGroup}
                            readOnly
                            disabled={isFieldLocked('economicGroup')}
                            placeholder="Selecione um grupo..."
                            onClick={() => !isFieldLocked('economicGroup') && setIsEconomicGroupModalOpen(true)}
                            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors cursor-pointer ${fieldErrors.economicGroup ? 'bg-red-50 border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300' : isFieldLocked('economicGroup') ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-[#3AE4B0] hover:bg-gray-50'} `}
                        />
                        {!isFieldLocked('economicGroup') && (
                            <button type="button" onClick={() => setIsEconomicGroupModalOpen(true)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600" > <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> </button>
                        )}
                    </div>
                    {fieldErrors.economicGroup && <span className="text-xs text-red-600 font-semibold mt-1">{fieldErrors.economicGroup}</span>}
                    {isEconomicGroupModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-25 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                                {isAddingNewGroup ? (
                                    <>
                                        <div className="bg-green-600 px-6 py-4 flex justify-between items-center text-white"><h3 className="font-bold text-lg">Novo Grupo Econômico</h3><button onClick={() => setIsAddingNewGroup(false)} className="text-white hover:text-green-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
                                        <div className="p-6 space-y-4"><div><label className="text-sm font-semibold text-gray-700 block mb-1">Nome do Grupo <span className="text-red-500">*</span></label><input type="text" value={newGroupData.name} onChange={(e) => setNewGroupData(prev => ({...prev, name: e.target.value}))} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3AE4B0]" placeholder="Ex: Grupo Safra Nova" autoFocus /></div><div><label className="text-sm font-semibold text-gray-700 block mb-1">Observações</label><textarea rows={3} value={newGroupData.observation} onChange={(e) => setNewGroupData(prev => ({...prev, observation: e.target.value}))} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3AE4B0]" placeholder="Informações adicionais sobre the grupo..." /></div></div>
                                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2"><button type="button" onClick={() => setIsAddingNewGroup(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded"> Cancelar </button><button type="button" onClick={handleSaveNewGroup} className="px-4 py-2 text-sm bg-[#3AE4B0] text-white font-bold rounded hover:bg-[#2ec295] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newGroupData.name.trim()}> Cadastrar & Selecionar </button></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800">Selecionar Grupo Econômico</h3><button onClick={() => setIsEconomicGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
                                        <div className="p-4 border-b"><input type="text" placeholder="Buscar grupo..." value={economicGroupSearch} onChange={(e) => setEconomicGroupSearch(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none" autoFocus /></div>
                                        <div className="overflow-y-auto flex-1 p-2 min-h-[200px]">{availableGroups.length === 0 ? (<p className="text-center text-gray-500 py-4 text-sm">Nenhum grupo encontrado.</p>) : (<ul className="space-y-1">{availableGroups.map(group => (<li key={group.id}><button type="button" onClick={() => { setFormData(prev => ({...prev, economicGroup: group.id})); setSelectedGroupName(group.name); clearFieldError('economicGroup'); setIsEconomicGroupModalOpen(false); setEconomicGroupSearch(''); }} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-green-50 hover:text-green-700 transition-colors ${formData.economicGroup === group.id ? 'bg-green-100 text-green-800 font-bold' : 'text-gray-700'}`}> {group.name} </button></li>))}</ul>)}</div>
                                        <div className="p-2 border-t bg-gray-50"><button type="button" onClick={() => { setIsAddingNewGroup(true); setNewGroupData({ name: '', observation: '' }); }} className="w-full py-2 flex items-center justify-center gap-1 text-green-700 font-bold text-sm hover:bg-green-100 rounded border border-green-200 transition-colors"> <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg> Novo Grupo Econômico </button></div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </section>

            {formData.category !== 'Fornecedores Diversos' && (
              <section className="animate-fade-in mb-6 border-b pb-6">
                  <div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="text-lg font-bold text-gray-800">Dados Complementares</h3></div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                          <div className="flex flex-col mb-4"><label className={`text-sm font-semibold mb-1 ${fieldErrors.plantedAreaSize ? 'text-red-600' : 'text-gray-700'}`}>Tamanho Área Plantada</label><select name="plantedAreaSize" value={formData.plantedAreaSize} onChange={handleInputChange} disabled={isFieldLocked('plantedAreaSize')} className="w-full border rounded-md px-3 py-2 text-sm bg-white border-gray-300 focus:ring-2 focus:ring-[#3AE4B0]"> <option value="">Selecione...</option> {AREA_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select></div>
                      </div>
                      <div className="md:col-span-1"><FormInput label="Qtd. Fazendas" name="farmQuantity" value={formData.farmQuantity} onChange={handleInputChange} error={fieldErrors.farmQuantity} disabled={isFieldLocked('farmQuantity')} placeholder="Apenas números" /></div>
                      <div className="md:col-span-1">
                          <div className="flex flex-col mb-4"><label className="text-sm font-semibold text-gray-700 mb-1">Perfil</label><select name="profile" value={formData.profile} onChange={handleInputChange} disabled={isFieldLocked('profile')} className="w-full border rounded-md px-3 py-2 text-sm bg-white border-gray-300 focus:ring-2 focus:ring-[#3AE4B0]"> <option value="">Selecione...</option> {PROFILE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select></div>
                      </div>
                      <div className="md:col-span-1">
                          <div className="flex flex-col mb-4"><label className="text-sm font-semibold text-gray-700 mb-1">Cargo</label><select name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} disabled={isFieldLocked('jobTitle')} className="w-full border rounded-md px-3 py-2 text-sm bg-white border-gray-300 focus:ring-2 focus:ring-[#3AE4B0]"> <option value="">Selecione...</option> {JOB_TITLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select></div>
                      </div>
                      <div className="md:col-span-1"><FormInput label="Origem Lead/Cliente" name="origin" value={formData.origin} onChange={handleInputChange} error={fieldErrors.origin} disabled={isFieldLocked('origin')} /></div>
                      <div className="md:col-span-4"><MultiSelect label="Culturas Plantadas" options={CROP_OPTIONS} value={formData.crops} onChange={(val) => { setFormData(prev => ({...prev, crops: val})); if (val.length > 0) clearFieldError('crops'); }} error={fieldErrors.crops} disabled={isFieldLocked('crops')} /></div>
                  </div>
              </section>
            )}

            <section className={`animate-fade-in ${isLead ? 'bg-purple-50 border border-purple-200' : 'bg-[#7D8D6D]'} rounded-lg p-4 mb-6`}>
                <div className={`flex justify-between items-center border-b ${isLead ? 'border-purple-200' : 'border-white/30'} pb-2 mb-4`}><h3 className={`text-lg font-bold ${isLead ? 'text-purple-900' : 'text-white'}`}>Dados de Cobrança (Matriz / Principal)</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1"><FormInput label="CNPJ/CPF Cobrança" name="docCob" value={formData.docCob} onChange={handleInputChange} disabled={isFieldLocked('docCob')} requiredMark={!isLead} error={fieldErrors.docCob} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-2"><FormInput label="Nome Cliente Cobrança" name="nameCob" value={formData.nameCob} onChange={handleInputChange} disabled={isFieldLocked('nameCob')} requiredMark={!isLead} error={fieldErrors.docCob} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-1"><FormInput label="CEP Cobrança" name="zipCodeCob" value={formData.zipCodeCob} onChange={handleInputChange} disabled={isFieldLocked('zipCodeCob')} requiredMark={!isLead} error={fieldErrors.zipCodeCob} maxLength={9} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-2"><FormInput label="Endereço Cobrança" name="addressCob" value={formData.addressCob} onChange={handleInputChange} disabled={isFieldLocked('addressCob')} requiredMark={!isLead} error={fieldErrors.addressCob} maxLength={40} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-1"><FormInput label="Bairro Cobrança" name="districtCob" value={formData.districtCob} onChange={handleInputChange} disabled={isFieldLocked('districtCob')} requiredMark={!isLead} error={fieldErrors.districtCob} maxLength={30} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-1"><FormInput label="Cidade Cobrança" name="cityCob" value={formData.cityCob} onChange={handleInputChange} disabled={isFieldLocked('cityCob')} requiredMark={!isLead} error={fieldErrors.cityCob} maxLength={50} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                    <div className="md:col-span-1"><FormInput label="Estado Cobrança" name="stateCob" value={formData.stateCob} onChange={handleInputChange} disabled={isFieldLocked('stateCob')} requiredMark={!isLead} error={fieldErrors.stateCob} maxLength={2} labelClassName={isLead ? 'text-purple-900' : 'text-white'} placeholder="UF" /></div>
                    <div className="md:col-span-1"><FormInput label="IE Cobrança" name="ieCob" value={formData.ieCob} onChange={handleInputChange} disabled={isFieldLocked('ieCob')} requiredMark={!isLead} error={fieldErrors.ieCob} labelClassName={isLead ? 'text-purple-900' : 'text-white'} /></div>
                </div>
            </section>

            <section className="animate-fade-in mb-6 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="text-lg font-bold text-gray-800">Dados Bancários</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3"><FormInput label="Banco" name="bankName" value={formData.bankName} onChange={handleInputChange} disabled={isFieldLocked('bankName')} placeholder="Ex: Banco do Brasil" /></div>
                        <div className="md:col-span-2"><FormInput label="Agência" name="agency" value={formData.agency} onChange={handleInputChange} disabled={isFieldLocked('agency')} maxLength={4} placeholder="Só números" /></div>
                        <div className="md:col-span-3"><FormInput label="Conta" name="account" value={formData.account} onChange={handleInputChange} disabled={isFieldLocked('account')} maxLength={13} placeholder="Só números" /></div>
                        <div className="md:col-span-1"><FormInput label="Dígito" name="accountDigit" value={formData.accountDigit} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 1); setFormData(prev => ({...prev, accountDigit: val})); }} disabled={isFieldLocked('accountDigit')} maxLength={1} className="text-center" /></div>
                        <div className="md:col-span-3"><FormInput label="Titular da Conta" name="accountHolder" value={formData.accountHolder} onChange={handleInputChange} disabled={isFieldLocked('accountHolder')} /></div>
                        <div className="md:col-span-6"><AttachmentField label="Comprovante de Conta Bancária (Anexo)" field="bankProofUrl" error={fieldErrors.bankProofUrl} inputClassName="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                </div>
            </section>

            {hasComercializacao && (
                <section className="animate-fade-in pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-4">Documentação Agrícola (Comercialização)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-1"><AttachmentField label="CAR (Anexo)" field="car" error={fieldErrors.car} inputClassName="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                        <div className="md:col-span-1"><AttachmentField label="Matrícula Imóvel (Anexo)" field="matricula" error={fieldErrors.matricula} inputClassName="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                    </div>
                </section>
            )}
            {isExistingRecord && (
                <section className="animate-fade-in pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Campos de Sistema (Auto-Preenchimento)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <div className="md:col-span-1"><FormInput label="Tipo Despesa" name="expenseTypeStandard" value={formData.expenseTypeStandard} disabled className="bg-gray-100 text-xs" /></div>
                        <div className="md:col-span-1"><FormInput label="Tipo Receita" name="revenueTypeStandard" value={formData.revenueTypeStandard} disabled className="bg-gray-100 text-xs" /></div>
                        <div className="md:col-span-1"><FormInput label="Portador" name="portador" value={formData.portador} disabled className="bg-gray-100 text-xs" /></div>
                        <div className="md:col-span-1"><FormInput label="Fiscal" name="fiscal" value={formData.fiscal} disabled className="bg-gray-100 text-xs" /></div>
                        <div className="md:col-span-1"><FormInput label="Cond. Pagto" name="paymentCondition" value={formData.paymentCondition} disabled className="bg-gray-100 text-xs" /></div>
                        <div className="md:col-span-1"><FormInput label="Situação" name="situation" value={formData.situation} disabled className="bg-gray-100 text-xs" /></div>
                    </div>
                </section>
            )}
            <section className="animate-fade-in">
                <ContactList contacts={formData.contacts} contactTypes={contactTypes} onChange={(contacts) => setFormData(prev => ({...prev, contacts}))} readOnly={isFieldLocked('contacts')} error={fieldErrors.contacts} />
            </section>
        </>
        )}
      </div>
    </form>
  );
};
