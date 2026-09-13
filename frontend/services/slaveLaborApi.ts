
import { supabase } from '../lib/supabase';

/**
 * Verifica se um documento (CPF ou CNPJ) consta na Lista Suja do Trabalho Escravo.
 * Agora utiliza uma função RPC no banco de dados para maior precisão e performance.
 *
 * @param document O documento a ser verificado (com ou sem formatação)
 * @returns Promise<boolean> True se constar na lista, False caso contrário
 */
export const checkSlaveLaborList = async (document: string): Promise<boolean> => {
  const cleanDoc = document.replace(/\D/g, '');

  // Validação de integridade: a função exige documento limpo com 11 ou 14 dígitos
  if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
    console.debug('[Compliance] Documento ignorado por tamanho inválido:', cleanDoc.length);
    return false;
  }

  console.debug('[Compliance] Iniciando verificação via RPC ultis.is_in_lista_suja para:', cleanDoc);

  try {
    // Chamando a função explicitamente no schema 'ultis' com o parâmetro correto 'p_doc'
    const { data, error } = await supabase.schema('ultis').rpc('is_in_lista_suja', {
      p_doc: cleanDoc
    });

    if (error) {
      console.error('[Compliance] Erro ao chamar RPC:', error);
      throw new Error(`Erro na verificação de compliance: ${error.message}`);
    }

    // A função RPC retorna explicitamente true se o documento estiver na lista
    const isInList = data === true;

    console.debug('[Compliance] Resultado da verificação:', isInList ? 'CONSTA NA LISTA' : 'NADA CONSTA');

    return isInList;
  } catch (error: any) {
    console.error('[Compliance] Falha crítica na verificação:', error);
    // Rethrow para que o componente ClientForm possa tratar o erro visualmente
    throw new Error(error.message || 'Erro inesperado ao consultar lista de compliance.');
  }
};