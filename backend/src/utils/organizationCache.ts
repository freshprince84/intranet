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
  private readonly TTL_MS = 2 * 60 * 1000; // 2 Minuten Cache

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
      // Hole aktuelle Rolle und Organisation des Users
      const userRole = await prisma.userRole.findFirst({
        where: { 
          userId: Number(userId),
          lastUsed: true 
        },
        include: {
          role: {
            include: {
              organization: true,
              permissions: true
            }
          }
        }
      });

      if (!userRole) {
        return null;
      }

      // Hole aktive Branch des Users
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

