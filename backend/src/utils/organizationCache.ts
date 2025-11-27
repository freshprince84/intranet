import { prisma } from './prisma';

interface OrganizationCacheEntry {
  data: {
    organizationId?: number;
    branchId?: number;
    userRole: any;
  };
  timestamp: number;
}

class OrganizationCache {
  private cache: Map<number, OrganizationCacheEntry> = new Map();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 Minuten Cache (statt 2 Minuten - reduziert DB-Queries um 80%)

  private isCacheValid(entry: OrganizationCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  async get(userId: number): Promise<{ organizationId?: number; branchId?: number; userRole: any } | null> {
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
      const userRole = await prisma.userRole.findFirst({
        where: { 
          userId: Number(userId),
          lastUsed: true 
        },
        include: {
          role: {
            include: {
              organization: {
                // ✅ PERFORMANCE: Settings NICHT laden (19.8 MB!)
                // Settings werden nur geladen wenn explizit angefragt (in getCurrentOrganization)
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  domain: true,
                  logo: true,
                  isActive: true,
                  maxUsers: true,
                  subscriptionPlan: true,
                  country: true,
                  nit: true,
                  createdAt: true,
                  updatedAt: true
                  // settings wird NICHT geladen
                }
              },
              permissions: true
            }
          }
        }
      });

      if (!userRole) {
        return null;
      }

      // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
      const userBranch = await prisma.usersBranches.findFirst({
        where: {
          userId: Number(userId),
          lastUsed: true
        },
        select: {
          branchId: true
        }
      });

      const data = {
        organizationId: userRole.role.organizationId,
        branchId: userBranch?.branchId,
        userRole: userRole
      };

      this.cache.set(userId, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`[OrganizationCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const entry of this.cache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries
    };
  }
}

export const organizationCache = new OrganizationCache();

