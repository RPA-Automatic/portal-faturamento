
import React, { useState, useEffect } from 'react';
import { Contact, DbContactType, JOB_TITLE_OPTIONS } from '../types';
import { formatPhone, cleanDigits } from '../utils';

interface ContactListProps {
  contacts: Contact[];
  contactTypes: DbContactType[];
  onChange: (contacts: Contact[]) => void;
  readOnly?: boolean;
  error?: string;
}

export const ContactList: React.FC<ContactListProps> = ({ contacts, contactTypes, onChange, readOnly, error }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState<Omit<Contact, 'id'>>({
    type: '',
    name: '',
    email: '',
    phone: '',
    position: '',
  });

  useEffect(() => {
    if (contactTypes.length > 0 && !newContact.type) {
      setNewContact(prev => ({ ...prev, type: contactTypes[0].nome }));
    }
  }, [contactTypes, isAdding]);

  // Se o tipo for marketing, e o cargo não estiver nas opções, limpamos para forçar a seleção da lista
  const isMarketing = newContact.type.toLowerCase() === 'marketing';

  useEffect(() => {
    if (isMarketing && !JOB_TITLE_OPTIONS.includes(newContact.position)) {
        setNewContact(prev => ({ ...prev, position: '' }));
    }
  }, [isMarketing]);

  const validateEmail = (email: string) => {
    const trimmedEmail = email.trim();
    const atMatches = trimmedEmail.match(/@/g) || [];

    return atMatches.length === 1 && trimmedEmail.includes('@') && trimmedEmail.includes('.');
  };

  const handleAdd = () => {
    setValidationError(null);
    if (!newContact.name || !newContact.email || !newContact.type) {
      setValidationError("Nome, E-mail e Tipo são obrigatórios.");
      return;
    }
    if (!validateEmail(newContact.email)) {
      setValidationError("O e-mail deve conter exatamente um '@' e pelo menos um '.'.");
      return;
    }

    // Validação de Duplicidade: Tipo, Email e Telefone
    const isDuplicate = contacts.some(c =>
      c.type.toLowerCase() === newContact.type.toLowerCase() &&
      c.email.toLowerCase() === newContact.email.toLowerCase() &&
      cleanDigits(c.phone) === cleanDigits(newContact.phone)
    );

    if (isDuplicate) {
      setValidationError("Já existe um contato cadastrado com este mesmo Tipo, E-mail e Telefone.");
      return;
    }

    onChange([...contacts, { ...newContact, id: Math.random().toString(36).substr(2, 9) }]);
    setNewContact({
      type: contactTypes[0]?.nome || '',
      name: '',
      email: '',
      phone: '',
      position: '',
    });
    setIsAdding(false);
  };

  return (
    <div className={`border rounded-lg p-4 mb-6 transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-md font-bold ${error ? 'text-red-800' : 'text-gray-800'}`}>Contatos</h3>
        {!readOnly && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm bg-[#3AE4B0] text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity"
          >
            + Adicionar Contato
          </button>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {contacts.length === 0 && <p className="text-sm text-gray-500 italic">Nenhum contato adicionado.</p>}
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase`}>
                  {contact.type}
                </span>
                <span className="font-semibold text-gray-800">{contact.name}</span>
              </div>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                <p><span className="font-medium">Email:</span> {contact.email}</p>
                <p><span className="font-medium">Tel:</span> {contact.phone}</p>
                <p><span className="font-medium">Cargo:</span> {contact.position}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdding && !readOnly && (
        <div className="bg-white p-4 rounded border border-[#3AE4B0]/30 shadow-sm animate-fade-in">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Novo Contato</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Contato</label>
              <select
                value={newContact.type}
                onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none"
              >
                {contactTypes.map(ct => (
                  <option key={ct.id} value={ct.nome}>{ct.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="exemplo@dominio.com"
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
              <input
                type="text"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: formatPhone(e.target.value) })}
                placeholder="+55 (00) 00000-0000"
                className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cargo</label>
              {isMarketing ? (
                <select
                    value={newContact.position}
                    onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none bg-white"
                >
                    <option value="">Selecione o cargo...</option>
                    {JOB_TITLE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
              ) : (
                <input
                    type="text"
                    value={newContact.position}
                    onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#3AE4B0] outline-none"
                />
              )}
            </div>
          </div>

          {validationError && (
            <div className="mb-3 text-xs text-red-600 font-bold">{validationError}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setValidationError(null); }}
              className="text-sm text-gray-600 px-3 py-1 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="text-sm bg-[#3AE4B0] text-white px-3 py-1 rounded hover:opacity-90 font-bold shadow-sm"
            >
              Salvar Contato
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-2 text-xs text-red-600 font-bold">{error}</div>}
    </div>
  );
};
