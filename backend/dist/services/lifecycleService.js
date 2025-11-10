"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleService = void 0;
const client_1 = require("@prisma/client");
const taskAutomationService_1 = require("./taskAutomationService");
const documentService_1 = require("./documentService");
const prisma = new client_1.PrismaClient();
/**
 * Service für Mitarbeiterlebenszyklus-Verwaltung
 */
class LifecycleService {
    /**
     * Ruft den Lebenszyklus-Status eines Users ab
     */
    static getLifecycle(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId },
                include: {
                    lifecycleEvents: {
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    employmentCertificates: {
                        where: { isLatest: true },
                        orderBy: { createdAt: 'desc' }
                    },
                    employmentContracts: {
                        where: { isLatest: true },
                        orderBy: { createdAt: 'desc' }
                    },
                    socialSecurityRegistrations: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            if (!lifecycle) {
                return null;
            }
            // Berechne Onboarding-Progress
            const progress = this.calculateProgress(lifecycle);
            return {
                lifecycle,
                progress
            };
        });
    }
    /**
     * Erstellt einen neuen Lebenszyklus für einen User
     */
    static createLifecycle(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prüfe ob bereits ein Lebenszyklus existiert
            const existing = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (existing) {
                return existing;
            }
            // Erstelle neuen Lebenszyklus
            const lifecycle = yield prisma.employeeLifecycle.create({
                data: {
                    userId,
                    organizationId,
                    status: 'onboarding',
                    onboardingStartedAt: new Date()
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: 'onboarding_started',
                    eventData: {
                        organizationId,
                        createdAt: new Date().toISOString()
                    }
                }
            });
            // Erstelle automatisch Onboarding-Tasks für Sozialversicherungen
            try {
                yield taskAutomationService_1.TaskAutomationService.createOnboardingTasks(userId, organizationId);
            }
            catch (error) {
                // Logge Fehler, aber breche nicht ab
                console.error('Fehler beim Erstellen der Onboarding-Tasks:', error);
            }
            return lifecycle;
        });
    }
    /**
     * Aktualisiert den Status eines Lebenszyklus
     */
    static updateStatus(userId, status, data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            const updateData = {
                status
            };
            // Status-spezifische Updates
            if (status === 'onboarding' && !lifecycle.onboardingStartedAt) {
                updateData.onboardingStartedAt = new Date();
            }
            if (status === 'active' && !lifecycle.onboardingCompletedAt) {
                updateData.onboardingCompletedAt = new Date();
            }
            if (status === 'offboarding' && !lifecycle.offboardingStartedAt) {
                updateData.offboardingStartedAt = new Date();
                // Erstelle automatisch Offboarding-Tasks
                try {
                    yield taskAutomationService_1.TaskAutomationService.createOffboardingTasks(userId, lifecycle.organizationId);
                }
                catch (error) {
                    // Logge Fehler, aber breche nicht ab
                    console.error('Fehler beim Erstellen der Offboarding-Tasks:', error);
                }
            }
            if (status === 'archived' && !lifecycle.offboardingCompletedAt) {
                updateData.offboardingCompletedAt = new Date();
                // Erstelle automatisch Arbeitszeugnis, falls noch keines existiert
                try {
                    const existingCertificates = yield prisma.employmentCertificate.findMany({
                        where: { lifecycleId: lifecycle.id }
                    });
                    // Nur erstellen, wenn noch kein Zertifikat existiert
                    if (existingCertificates.length === 0 && generatedBy) {
                        yield this.createCertificate(userId, {
                            certificateType: 'employment',
                            templateUsed: 'default',
                            templateVersion: '1.0'
                        }, generatedBy);
                        console.log(`✅ Automatisch Arbeitszeugnis erstellt für User ${userId} beim Offboarding-Abschluss`);
                    }
                }
                catch (error) {
                    // Logge Fehler, aber breche nicht ab
                    console.error('Fehler beim automatischen Erstellen des Arbeitszeugnisses:', error);
                }
                // Deaktiviere User (nicht löschen!)
                try {
                    yield prisma.user.update({
                        where: { id: userId },
                        data: { active: false }
                    });
                    console.log(`✅ User ${userId} wurde deaktiviert beim Archivieren`);
                }
                catch (error) {
                    // Logge Fehler, aber breche nicht ab
                    console.error('Fehler beim Deaktivieren des Users:', error);
                }
                // Optional: Prüfe, ob alle Offboarding-Tasks abgeschlossen sind (nur Warnung)
                // Suche Tasks, die für diesen User erstellt wurden (über Branch oder Rolle)
                try {
                    // Hole User mit Branch-Informationen
                    const user = yield prisma.user.findUnique({
                        where: { id: userId },
                        include: {
                            branches: {
                                take: 1,
                                include: {
                                    branch: true
                                }
                            }
                        }
                    });
                    if (user && user.branches.length > 0) {
                        const branchId = user.branches[0].branch.id;
                        const offboardingTasks = yield prisma.task.findMany({
                            where: {
                                branchId: branchId,
                                title: {
                                    in: [
                                        'Crear certificado laboral',
                                        'Realizar liquidación final',
                                        'Desafiliar de seguridad social'
                                    ]
                                },
                                // Prüfe, ob Task-Beschreibung den User-Namen enthält
                                description: {
                                    contains: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
                                }
                            }
                        });
                        const completedTasks = offboardingTasks.filter(task => task.status === 'done');
                        if (offboardingTasks.length > 0 && completedTasks.length < offboardingTasks.length) {
                            console.warn(`⚠️ User ${userId} wird archiviert, aber nicht alle Offboarding-Tasks sind abgeschlossen ` +
                                `(${completedTasks.length}/${offboardingTasks.length})`);
                        }
                    }
                }
                catch (error) {
                    // Logge Fehler, aber breche nicht ab
                    console.error('Fehler beim Prüfen der Offboarding-Tasks:', error);
                }
            }
            // Zusätzliche Daten
            if (data) {
                if (data.contractStartDate)
                    updateData.contractStartDate = data.contractStartDate;
                if (data.contractEndDate)
                    updateData.contractEndDate = data.contractEndDate;
                if (data.contractType)
                    updateData.contractType = data.contractType;
                if (data.exitDate)
                    updateData.exitDate = data.exitDate;
                if (data.exitReason)
                    updateData.exitReason = data.exitReason;
            }
            const updated = yield prisma.employeeLifecycle.update({
                where: { userId },
                data: updateData
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: updated.id,
                    eventType: `status_changed_to_${status}`,
                    eventData: Object.assign({ previousStatus: lifecycle.status, newStatus: status }, data)
                }
            });
            return updated;
        });
    }
    /**
     * Berechnet den Onboarding-Progress
     */
    static calculateProgress(lifecycle) {
        const steps = [
            { key: 'passport', check: () => true }, // Passport wird über IdentificationDocument geprüft
            { key: 'arl', check: () => lifecycle.arlStatus === 'registered' },
            { key: 'eps', check: () => !lifecycle.epsRequired || lifecycle.epsStatus === 'registered' },
            { key: 'pension', check: () => lifecycle.pensionStatus === 'registered' },
            { key: 'caja', check: () => lifecycle.cajaStatus === 'registered' }
        ];
        const completed = steps.filter(step => step.check()).length;
        const total = steps.length;
        const percent = Math.round((completed / total) * 100);
        return { completed, total, percent };
    }
    /**
     * Ruft den Status einer Sozialversicherung ab
     */
    static getSocialSecurityStatus(userId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                return null;
            }
            // Hole aus EmployeeLifecycle oder SocialSecurityRegistration
            const registration = yield prisma.socialSecurityRegistration.findUnique({
                where: {
                    lifecycleId_registrationType: {
                        lifecycleId: lifecycle.id,
                        registrationType: type
                    }
                }
            });
            if (registration) {
                return {
                    type,
                    status: registration.status,
                    number: registration.registrationNumber,
                    provider: registration.provider,
                    registeredAt: registration.registrationDate,
                    notes: registration.notes
                };
            }
            // Fallback zu EmployeeLifecycle-Feldern
            const statusField = `${type}Status`;
            const numberField = `${type}Number`;
            const providerField = `${type}Provider`;
            const registeredAtField = `${type}RegisteredAt`;
            return {
                type,
                status: lifecycle[statusField],
                number: lifecycle[numberField],
                provider: lifecycle[providerField],
                registeredAt: lifecycle[registeredAtField],
                notes: null
            };
        });
    }
    /**
     * Aktualisiert den Status einer Sozialversicherung
     */
    static updateSocialSecurityStatus(userId, type, data, completedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            // Update EmployeeLifecycle-Felder
            const updateData = {};
            updateData[`${type}Status`] = data.status;
            if (data.number)
                updateData[`${type}Number`] = data.number;
            if (data.provider)
                updateData[`${type}Provider`] = data.provider;
            if (data.registrationDate)
                updateData[`${type}RegisteredAt`] = data.registrationDate;
            yield prisma.employeeLifecycle.update({
                where: { userId },
                data: updateData
            });
            // Update oder erstelle SocialSecurityRegistration
            yield prisma.socialSecurityRegistration.upsert({
                where: {
                    lifecycleId_registrationType: {
                        lifecycleId: lifecycle.id,
                        registrationType: type
                    }
                },
                create: {
                    lifecycleId: lifecycle.id,
                    registrationType: type,
                    status: data.status,
                    registrationNumber: data.number,
                    provider: data.provider,
                    registrationDate: data.registrationDate,
                    notes: data.notes,
                    completedBy,
                    completedAt: data.status === 'registered' ? new Date() : null
                },
                update: {
                    status: data.status,
                    registrationNumber: data.number,
                    provider: data.provider,
                    registrationDate: data.registrationDate,
                    notes: data.notes,
                    completedBy,
                    completedAt: data.status === 'registered' ? new Date() : null
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: `${type}_status_updated`,
                    eventData: {
                        type,
                        status: data.status,
                        number: data.number,
                        provider: data.provider
                    },
                    triggeredBy: completedBy
                }
            });
            return this.getSocialSecurityStatus(userId, type);
        });
    }
    /**
     * Ruft alle Arbeitszeugnisse eines Users ab
     */
    static getCertificates(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                return null;
            }
            const certificates = yield prisma.employmentCertificate.findMany({
                where: { lifecycleId: lifecycle.id },
                orderBy: { createdAt: 'desc' },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            return certificates;
        });
    }
    /**
     * Ruft ein einzelnes Arbeitszeugnis ab
     */
    static getCertificate(userId, certificateId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                return null;
            }
            const certificate = yield prisma.employmentCertificate.findFirst({
                where: {
                    id: certificateId,
                    lifecycleId: lifecycle.id
                },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            return certificate;
        });
    }
    /**
     * Erstellt ein neues Arbeitszeugnis
     * Generiert automatisch ein PDF, falls pdfPath nicht angegeben ist
     */
    static createCertificate(userId, data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            // Setze alle anderen Certificates auf isLatest = false
            yield prisma.employmentCertificate.updateMany({
                where: {
                    lifecycleId: lifecycle.id,
                    isLatest: true
                },
                data: {
                    isLatest: false
                }
            });
            // Generiere PDF falls nicht angegeben
            let pdfPath = data.pdfPath;
            if (!pdfPath) {
                pdfPath = yield documentService_1.DocumentService.generateCertificate({
                    userId,
                    certificateType: data.certificateType,
                    templateUsed: data.templateUsed,
                    templateVersion: data.templateVersion,
                    customText: data.customText
                }, generatedBy);
            }
            // Erstelle neues Certificate
            const certificate = yield prisma.employmentCertificate.create({
                data: {
                    lifecycleId: lifecycle.id,
                    certificateType: data.certificateType || 'employment',
                    pdfPath,
                    templateUsed: data.templateUsed || 'default',
                    templateVersion: data.templateVersion || '1.0',
                    generatedBy,
                    isLatest: true
                },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: 'certificate_created',
                    eventData: {
                        certificateId: certificate.id,
                        certificateType: certificate.certificateType
                    },
                    triggeredBy: generatedBy
                }
            });
            return certificate;
        });
    }
    /**
     * Aktualisiert ein Arbeitszeugnis (nur für neue Versionen)
     */
    static updateCertificate(userId, certificateId, data, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            const certificate = yield prisma.employmentCertificate.findFirst({
                where: {
                    id: certificateId,
                    lifecycleId: lifecycle.id
                }
            });
            if (!certificate) {
                throw new Error('Arbeitszeugnis nicht gefunden');
            }
            const updated = yield prisma.employmentCertificate.update({
                where: { id: certificateId },
                data: {
                    pdfPath: data.pdfPath || certificate.pdfPath,
                    templateVersion: data.templateVersion || certificate.templateVersion
                },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: 'certificate_updated',
                    eventData: {
                        certificateId: certificate.id
                    },
                    triggeredBy: updatedBy
                }
            });
            return updated;
        });
    }
    /**
     * Ruft alle Arbeitsverträge eines Users ab
     */
    static getContracts(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                return null;
            }
            const contracts = yield prisma.employmentContract.findMany({
                where: { lifecycleId: lifecycle.id },
                orderBy: { createdAt: 'desc' },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    contractDocuments: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            return contracts;
        });
    }
    /**
     * Ruft einen einzelnen Arbeitsvertrag ab
     */
    static getContract(userId, contractId) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                return null;
            }
            const contract = yield prisma.employmentContract.findFirst({
                where: {
                    id: contractId,
                    lifecycleId: lifecycle.id
                },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    contractDocuments: {
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            return contract;
        });
    }
    /**
     * Erstellt einen neuen Arbeitsvertrag
     * Generiert automatisch ein PDF, falls pdfPath nicht angegeben ist
     */
    static createContract(userId, data, generatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            // Setze alle anderen Contracts auf isLatest = false
            yield prisma.employmentContract.updateMany({
                where: {
                    lifecycleId: lifecycle.id,
                    isLatest: true
                },
                data: {
                    isLatest: false
                }
            });
            // Generiere PDF falls nicht angegeben
            let pdfPath = data.pdfPath;
            if (!pdfPath) {
                pdfPath = yield documentService_1.DocumentService.generateContract({
                    userId,
                    contractType: data.contractType || 'employment',
                    startDate: data.startDate,
                    endDate: data.endDate,
                    salary: data.salary,
                    workingHours: data.workingHours,
                    position: data.position,
                    templateUsed: data.templateUsed,
                    templateVersion: data.templateVersion,
                    customText: data.customText
                }, generatedBy);
            }
            // Erstelle neuen Contract
            const contract = yield prisma.employmentContract.create({
                data: {
                    lifecycleId: lifecycle.id,
                    contractType: data.contractType || 'employment',
                    startDate: data.startDate,
                    endDate: data.endDate,
                    salary: data.salary,
                    workingHours: data.workingHours,
                    position: data.position,
                    pdfPath,
                    templateUsed: data.templateUsed || 'default',
                    templateVersion: data.templateVersion || '1.0',
                    generatedBy,
                    isLatest: true
                },
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: 'contract_created',
                    eventData: {
                        contractId: contract.id,
                        contractType: contract.contractType
                    },
                    triggeredBy: generatedBy
                }
            });
            return contract;
        });
    }
    /**
     * Aktualisiert einen Arbeitsvertrag (nur für neue Versionen)
     */
    static updateContract(userId, contractId, data, updatedBy) {
        return __awaiter(this, void 0, void 0, function* () {
            const lifecycle = yield prisma.employeeLifecycle.findUnique({
                where: { userId }
            });
            if (!lifecycle) {
                throw new Error('Lebenszyklus nicht gefunden');
            }
            const contract = yield prisma.employmentContract.findFirst({
                where: {
                    id: contractId,
                    lifecycleId: lifecycle.id
                }
            });
            if (!contract) {
                throw new Error('Arbeitsvertrag nicht gefunden');
            }
            const updateData = {};
            if (data.startDate)
                updateData.startDate = data.startDate;
            if (data.endDate !== undefined)
                updateData.endDate = data.endDate;
            if (data.salary !== undefined)
                updateData.salary = data.salary;
            if (data.workingHours !== undefined)
                updateData.workingHours = data.workingHours;
            if (data.position)
                updateData.position = data.position;
            if (data.pdfPath)
                updateData.pdfPath = data.pdfPath;
            if (data.templateVersion)
                updateData.templateVersion = data.templateVersion;
            const updated = yield prisma.employmentContract.update({
                where: { id: contractId },
                data: updateData,
                include: {
                    generatedByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            });
            // Erstelle Event
            yield prisma.lifecycleEvent.create({
                data: {
                    lifecycleId: lifecycle.id,
                    eventType: 'contract_updated',
                    eventData: {
                        contractId: contract.id
                    },
                    triggeredBy: updatedBy
                }
            });
            return updated;
        });
    }
}
exports.LifecycleService = LifecycleService;
//# sourceMappingURL=lifecycleService.js.map