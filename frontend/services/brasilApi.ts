
export interface BrasilApiCnpjResponse {
  cnpj: string;
  identificador_matriz_filial: number; // 1 - Matriz, 2 - Filial
  descricao_identificador_matriz_filial: string;
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  descricao_tipo_de_logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  qsa?: Array<{ nome_socio: string; cnpj_cpf_do_socio: string }>; // Sócios
}

export interface BrasilApiCepResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
}

const PROXY_URL = "https://corsproxy.io/?";

const fetchWithFallback = async (url: string) => {
  try {
    const response = await fetch(url);
    if (response.ok) return response;
    throw new Error('Direct fetch failed');
  } catch (e) {
    console.warn(`Tentando via proxy para: ${url}`);
    return fetch(`${PROXY_URL}${encodeURIComponent(url)}`);
  }
};

export const fetchCnpjData = async (cnpj: string): Promise<BrasilApiCnpjResponse | null> => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return null;

  try {
    const response = await fetchWithFallback(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

    if (!response.ok) {
      throw new Error(`BrasilAPI returned ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('BrasilAPI indisponível ou bloqueada. Utilizando dados de Mock.', error);

    return {
        cnpj: cleanCnpj,
        identificador_matriz_filial: 1,
        descricao_identificador_matriz_filial: 'MATRIZ',
        razao_social: 'Empresa de Demonstração Ltda (Acentuação de Teste)',
        nome_fantasia: 'Empresa de Demonstração (MOCK)',
        logradouro: 'Avenida das Nações Unidas',
        descricao_tipo_de_logradouro: 'AVENIDA',
        numero: '1234',
        bairro: 'Brooklin Novo',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '04578-000',
        qsa: []
    };
  }
};

export const fetchCepData = async (cep: string): Promise<BrasilApiCepResponse | null> => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetchWithFallback(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);

    if (!response.ok) {
      throw new Error(`BrasilAPI CEP returned ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Erro ao buscar CEP. Retornando null para tratamento manual.', error);
    return null;
  }
};
