#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDetails() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log('='.repeat(80));
    console.log('DETAILPRÜFUNG: Tasks und Notifications');
    console.log('='.repeat(80));
    console.log('');
    
    // Prüfe Tasks
    const tasks = await prisma.task.findMany({
      where: { createdAt: { gte: yesterday } },
      include: {
        role: { select: { id: true, name: true } },
        reservation: { select: { id: true, guestName: true, lobbyReservationId: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`TASKS ERSTELLT: ${tasks.length} (zeige erste 10)`);
    console.log('');
    tasks.forEach(t => {
      console.log(`Task ID ${t.id}: "${t.title}"`);
      console.log(`  roleId: ${t.roleId} (${t.role?.name || 'N/A'})`);
      console.log(`  responsibleId: ${t.responsibleId || 'NULL'}`);
      console.log(`  organizationId: ${t.organizationId || 'NULL'}`);
      console.log(`  branchId: ${t.branchId}`);
      console.log(`  status: ${t.status}`);
      if (t.reservation) {
        console.log(`  Reservation: ${t.reservation.guestName} (Lobby ID: ${t.reservation.lobbyReservationId})`);
      }
      console.log('');
    });
    
    // Prüfe welche Rolle das ist
    if (tasks.length > 0 && tasks[0].roleId) {
      const roleId = tasks[0].roleId;
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { id: true, name: true }
      });
      console.log(`\nROLLE: ${role?.name || 'N/A'} (ID: ${roleId})`);
      
      // Prüfe welche User diese Rolle haben
      const usersWithRole = await prisma.userRole.findMany({
        where: { roleId: roleId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        take: 10
      });
      console.log(`\nUSER MIT DIESER ROLLE: ${usersWithRole.length}`);
      usersWithRole.forEach(ur => {
        console.log(`  User ID ${ur.userId}: ${ur.user.firstName} ${ur.user.lastName} (${ur.user.email})`);
      });
    }
    
    // Prüfe Notifications
    const notifications = await prisma.notification.findMany({
      where: { createdAt: { gte: yesterday } },
      select: { id: true, title: true, userId: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`\nNOTIFICATIONS ERSTELLT: ${notifications.length} (zeige erste 10)`);
    console.log('');
    notifications.forEach(n => {
      console.log(`Notification ID ${n.id}: "${n.title}"`);
      console.log(`  userId: ${n.userId}`);
      console.log(`  type: ${n.type}`);
      console.log(`  createdAt: ${n.createdAt.toISOString()}`);
      console.log('');
    });
    
    // Prüfe welche User die Notifications bekommen haben
    const uniqueUserIds = [...new Set(notifications.map(n => n.userId))];
    console.log(`\nUNIQUE USER IDs IN NOTIFICATIONS: ${uniqueUserIds.length}`);
    for (const uid of uniqueUserIds.slice(0, 10)) {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      if (user) {
        console.log(`  User ID ${uid}: ${user.firstName} ${user.lastName} (${user.email})`);
      }
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDetails();

