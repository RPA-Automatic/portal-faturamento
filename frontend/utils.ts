export const formatCNPJ = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '').substring(0, 14);

  return v
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const formatCPF = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '').substring(0, 11);

  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatCEP = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '').substring(0, 8);
  return v.replace(/(\d{5})(\d)/, '$1-$2');
};

export const formatRG = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '').substring(0, 9);
  return v
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatIE = (value: string) => {
  if (!value) return '';
  // IE pode conter letras em alguns estados (ex: MG), então removemos apenas caracteres especiais
  // e mantemos letras e números em caixa alta.
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export const formatPhone = (value: string) => {
  if (!value) return '';
  // Remove tudo que não é dígito
  const v = value.replace(/\D/g, '').substring(0, 13);

  // Formato: +XX (XX) XXXXX-XXXX ou +XX (XX) XXXX-XXXX
  if (v.length <= 12) { // Caso com 8 dígitos no número final
    return v
      .replace(/^(\d{2})(\d)/, '+$1 ($2')
      .replace(/^(\+\d{2}\s\(\d{2})(\d)/, '$1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else { // Caso com 9 dígitos (celular)
    return v
      .replace(/^(\d{2})(\d)/, '+$1 ($2')
      .replace(/^(\+\d{2}\s\(\d{2})(\d)/, '$1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
};

export const cleanDigits = (value: string) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

export const normalizePlantedAreaSize = (value: string) => {
  if (!value) return '';

  const normalized = value.trim().toLowerCase();

  const directMap: Record<string, string> = {
    '0 a 3.000 hectare': '0 a 3.000 hectare',
    '0 a 3000 hectares': '0 a 3.000 hectare',
    '3.000 a 5.000 hectare': '3.000 a 5.000 hectare',
    '3000 a 5000 hectares': '3.000 a 5.000 hectare',
    '5.000 a 10.000 hectare': '5.000 a 10.000 hectare',
    '5000 a 10000 hectares': '5.000 a 10.000 hectare',
    'mais de 10.000 hectare': 'Mais de 10.000 hectare',
    'mais de 10000 hectares': 'Mais de 10.000 hectare',
  };

  const mapped = directMap[normalized];
  if (mapped) return mapped;

  const digitsOnly = normalized.replace(/\./g, '');
  if (digitsOnly.includes('0 a 3000')) return '0 a 3.000 hectare';
  if (digitsOnly.includes('3000 a 5000')) return '3.000 a 5.000 hectare';
  if (digitsOnly.includes('5000 a 10000')) return '5.000 a 10.000 hectare';
  if (digitsOnly.includes('mais de 10000')) return 'Mais de 10.000 hectare';

  return value;
};

const calcDigitoCNPJ = (base: string, pesos: number[]): number => {
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += parseInt(base[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
};

export const generateMatrizCnpj = (branchCnpj: string): string => {
  const clean = cleanDigits(branchCnpj);
  if (clean.length !== 14) return branchCnpj;

  const raiz = clean.substring(0, 8);
  const sufixoMatriz = '0001';
  let baseCalculo = raiz + sufixoMatriz;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digito1 = calcDigitoCNPJ(baseCalculo, pesos1);

  baseCalculo += digito1;

  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digito2 = calcDigitoCNPJ(baseCalculo, pesos2);

  return raiz + sufixoMatriz + digito1 + digito2;
};