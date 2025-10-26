import React, { useState } from 'react';
import { organizationService } from '../../services/organizationService';
import { CreateJoinRequestRequest } from '../../types/organization';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const JoinOrganizationModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<CreateJoinRequestRequest>({
    organizationName: '',
    message: ''
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
      await organizationService.createJoinRequest(formData);
      setError(null);
      alert('Beitrittsanfrage erfolgreich gesendet');
      onClose();
    } catch (err) {
      setError('Fehler beim Senden der Beitrittsanfrage');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Organisation beitreten</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="organizationName">Organisationsname</label>
            <input
              type="text"
              id="organizationName"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="message">Nachricht</label>
            <input
              type="text"
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading}>Senden</button>
          {error && <p>{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default JoinOrganizationModal; 