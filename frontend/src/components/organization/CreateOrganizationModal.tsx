import React, { useState } from 'react';
import { organizationService } from '../../services/organizationService';
import { CreateOrganizationRequest } from '../../types/organization';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CreateOrganizationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<CreateOrganizationRequest>({
    name: '',
    displayName: '',
    domain: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await organizationService.createOrganization(formData);
      setError(null);
      alert('Organisation erfolgreich erstellt');
      onClose();
    } catch (err) {
      setError('Fehler beim Erstellen der Organisation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Neue Organisation erstellen</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="displayName">Anzeigename</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="domain">Domain</label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>Erstellen</button>
          {error && <p>{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationModal; 