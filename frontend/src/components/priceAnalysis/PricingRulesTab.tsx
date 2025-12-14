import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';

interface PricingRule {
    id: number;
    branchId: number;
    name: string;
    description: string | null;
    conditions: any;
    action: any;
    roomTypes: any;
    categoryIds: any;
    priority: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: number | null;
    createdByUser: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        username: string;
    } | null;
}

const PricingRulesTab: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const { showMessage } = useMessage();
    const errorContext = useError();
    const { currentBranch } = useBranch();
    
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error('Fehler:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Ein Fehler ist aufgetreten';
        showMessage(errorMessage, 'error');
    });

    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 0,
        isActive: true,
        conditions: JSON.stringify({ occupancyRate: { operator: '>', value: 80 } }, null, 2),
        action: JSON.stringify({ type: 'increase', value: 15, maxChange: 30, minPrice: 40000, maxPrice: 80000, cumulative: true }, null, 2),
        roomTypes: '',
        categoryIds: ''
    });

    useEffect(() => {
        if (currentBranch) {
            loadRules();
        }
    }, [currentBranch]);

    const loadRules = async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BASE, {
                params: {
                    branchId: currentBranch.id
                }
            });
            setRules(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingRule(null);
        setFormData({
            name: '',
            description: '',
            priority: 0,
            isActive: true,
            conditions: JSON.stringify({ occupancyRate: { operator: '>', value: 80 } }, null, 2),
            action: JSON.stringify({ type: 'increase', value: 15, maxChange: 30, minPrice: 40000, maxPrice: 80000, cumulative: true }, null, 2),
            roomTypes: '',
            categoryIds: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (rule: PricingRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description || '',
            priority: rule.priority,
            isActive: rule.isActive,
            conditions: JSON.stringify(rule.conditions, null, 2),
            action: JSON.stringify(rule.action, null, 2),
            roomTypes: rule.roomTypes ? JSON.stringify(rule.roomTypes) : '',
            categoryIds: rule.categoryIds ? JSON.stringify(rule.categoryIds) : ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (ruleId: number) => {
        if (!window.confirm(t('priceAnalysis.rules.deleteConfirm', 'Regel wirklich löschen?'))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BY_ID(ruleId));
            showMessage(t('priceAnalysis.rules.deleted', 'Regel gelöscht'), 'success');
            loadRules();
        } catch (error: any) {
            handleError(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentBranch) return;

        try {
            let conditions, action, roomTypes, categoryIds;

            // Parse JSON
            try {
                conditions = JSON.parse(formData.conditions);
                action = JSON.parse(formData.action);
                roomTypes = formData.roomTypes ? JSON.parse(formData.roomTypes) : null;
                categoryIds = formData.categoryIds ? JSON.parse(formData.categoryIds) : null;
            } catch (error) {
                showMessage(t('priceAnalysis.rules.invalidJson', 'Ungültiges JSON-Format'), 'error');
                return;
            }

            const payload = {
                branchId: currentBranch.id,
                name: formData.name,
                description: formData.description || null,
                conditions,
                action,
                roomTypes,
                categoryIds,
                priority: formData.priority,
                isActive: formData.isActive
            };

            if (editingRule) {
                await axiosInstance.put(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BY_ID(editingRule.id), payload);
                showMessage(t('priceAnalysis.rules.updated', 'Regel aktualisiert'), 'success');
            } else {
                await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BASE, payload);
                showMessage(t('priceAnalysis.rules.created', 'Regel erstellt'), 'success');
            }

            setIsModalOpen(false);
            loadRules();
        } catch (error: any) {
            handleError(error);
        }
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    if (loading) {
        return <div>{t('priceAnalysis.loading')}</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                    onClick={handleCreate}
                    disabled={!hasPermission('price_analysis_create_rule', 'write', 'button')}
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                </button>
            </div>

            {rules.length === 0 ? (
                <div>{t('priceAnalysis.rules.noRules', 'Keine Preisregeln gefunden')}</div>
            ) : (
                <div>
                    <h3>{t('priceAnalysis.rules.title', 'Preisregeln')}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.rules.name', 'Name')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.rules.description', 'Beschreibung')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.rules.priority', 'Priorität')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.rules.status', 'Status')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.rules.createdBy', 'Erstellt von')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.rules.createdAt', 'Erstellt am')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('common.actions', 'Aktionen')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule) => (
                                    <tr key={rule.id}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{rule.name}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{rule.description || '-'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{rule.priority}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: rule.isActive ? '#28a745' : '#6c757d',
                                                color: 'white',
                                                fontSize: '12px'
                                            }}>
                                                {rule.isActive ? t('priceAnalysis.active', 'Aktiv') : t('priceAnalysis.inactive', 'Inaktiv')}
                                            </span>
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {rule.createdByUser 
                                                ? `${rule.createdByUser.firstName || ''} ${rule.createdByUser.lastName || ''}`.trim() || rule.createdByUser.username
                                                : '-'
                                            }
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(rule.createdAt)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    onClick={() => handleEdit(rule)}
                                                    disabled={!hasPermission('price_analysis_edit_rule', 'write', 'button')}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    {t('common.edit', 'Bearbeiten')}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    disabled={!hasPermission('price_analysis_delete_rule', 'write', 'button')}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    {t('common.delete', 'Löschen')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal für Erstellen/Bearbeiten */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ marginBottom: '20px' }}>
                            {editingRule ? t('priceAnalysis.rules.edit', 'Regel bearbeiten') : t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.name', 'Name')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.description', 'Beschreibung')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.priority', 'Priorität')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    {t('priceAnalysis.rules.isActive', 'Aktiv')}
                                </label>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.conditions', 'Bedingungen')} (JSON) *
                                </label>
                                <textarea
                                    value={formData.conditions}
                                    onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', minHeight: '100px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.action', 'Aktion')} (JSON) *
                                </label>
                                <textarea
                                    value={formData.action}
                                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', minHeight: '100px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.roomTypes', 'Zimmerarten')} (JSON, optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.roomTypes}
                                    onChange={(e) => setFormData({ ...formData, roomTypes: e.target.value })}
                                    placeholder='["dorm", "private"] oder leer für alle'
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                    {t('priceAnalysis.rules.categoryIds', 'Kategorie-IDs')} (JSON, optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.categoryIds}
                                    onChange={(e) => setFormData({ ...formData, categoryIds: e.target.value })}
                                    placeholder='[34280, 34281] oder leer für alle'
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('common.cancel', 'Abbrechen')}
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '8px 16px',
                                        background: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('common.save', 'Speichern')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingRulesTab;

