import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Prüft ob User eine bestimmte Lebenszyklus-Rolle hat
 * Nutzt req.organizationId und req.userRole aus organizationMiddleware
 */
export async function hasLifecycleRole(
  req: Request,
  roleType: 'admin' | 'hr' | 'legal'
): Promise<boolean> {
  if (!req.organizationId || !req.userRole) {
    return false; // Keine Organisation oder keine aktive Rolle
  }

  // 1. Hole Organization mit settings
  const organization = await prisma.organization.findUnique({
    where: { id: req.organizationId },
    select: { settings: true }
  });

  if (!organization) return false;

  const settings = organization.settings as any;
  const lifecycleRoles = settings?.lifecycleRoles;

  // 2. Falls keine Konfiguration: Standard-Zuordnung prüfen
  if (!lifecycleRoles) {
    return checkDefaultRoles(req.userRole.role, roleType);
  }

  // 3. Prüfe Rollen-ID gegen konfigurierte Rollen
  const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
  if (!targetRoleId) return false;

  // 4. Prüfe ob aktive Rolle die Ziel-Rolle ist
  return req.userRole.roleId === targetRoleId;
}

/**
 * Prüft Standard-Rollen (Fallback wenn keine Konfiguration)
 */
function checkDefaultRoles(
  role: { name: string },
  roleType: 'admin' | 'hr' | 'legal'
): boolean {
  const roleName = role.name.toLowerCase();

  if (roleType === 'admin' || roleType === 'hr') {
    // Admin oder HR: Suche nach Admin-Rolle
    return roleName.includes('admin') || roleName.includes('administrator');
  }

  if (roleType === 'legal') {
    // Legal: Suche nach "Derecho"-Rolle
    return roleName === 'derecho';
  }

  return false;
}

/**
 * Prüft ob User HR oder Admin ist
 */
export async function isHROrAdmin(req: Request): Promise<boolean> {
  const isHR = await hasLifecycleRole(req, 'hr');
  const isAdmin = await hasLifecycleRole(req, 'admin');
  return isHR || isAdmin;
}

/**
 * Prüft ob User Legal oder Admin ist
 */
export async function isLegalOrAdmin(req: Request): Promise<boolean> {
  const isLegal = await hasLifecycleRole(req, 'legal');
  const isAdmin = await hasLifecycleRole(req, 'admin');
  return isLegal || isAdmin;
}

