
import { supabase } from '../lib/supabase';

/**
 * Realiza o upload de um arquivo para o bucket 'docs_cadastros' seguindo a estrutura:
 * {cadastro_id}/{tipo_documento}/{nome_do_arquivo}_{timestamp}.{extensao}
 *
 * @param file O arquivo selecionado pelo usuário
 * @param cadastroId O UUID do cadastro (ou UUID temporário para novos registros)
 * @param docType O nome da pasta do tipo de documento (ex: 'car', 'matricula')
 * @returns O path do arquivo no storage (não a URL pública)
 */
export const uploadDocument = async (file: File, cadastroId: string, docType: string): Promise<string> => {
  if (!file) throw new Error("Nenhum arquivo fornecido para upload.");

  // Sanitização simples do nome do arquivo para evitar caracteres especiais problemáticos
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const fileExt = sanitizedName.split('.').pop();
  const nameWithoutExt = sanitizedName.substring(0, sanitizedName.lastIndexOf('.'));

  // Estrutura exigida: {nome_do_arquivo}_{timestamp}.{extensao}
  const finalFileName = `${nameWithoutExt}_${Date.now()}.${fileExt}`;

  // REGRA DE OURO: Primeira pasta = cadastro_id
  const filePath = `${cadastroId}/${docType}/${finalFileName}`;

  const { data, error } = await supabase.storage
    .from('docs_cadastros')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true // Permite substituir se necessário
    });

  if (error) {
    console.error(`Erro no upload de ${docType}:`, error);
    throw new Error(`Falha ao enviar documento (${docType}): ${error.message}`);
  }

  // Retorna apenas o path, conforme solicitado para a RPC
  return data.path;
};