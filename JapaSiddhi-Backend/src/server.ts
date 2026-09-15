import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { initializeSocket } from './socket/socketServer';
import { initializeFirebase } from './firebase/firebase';
import { purgeDemoData } from './utils/demoData';
import { startNotificationReminderScheduler } from './modules/notification/notificationReminder.service';

// ✅ Initialize Firebase Admin BEFORE starting the server
initializeFirebase();

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, '0.0.0.0', async () => {
    await purgeDemoData();
    startNotificationReminderScheduler();
    console.log('========================================');
    console.log(`🚀 Japa Siddhi Backend Started`);
    console.log(`🌐 Port : ${PORT}`);
    console.log('========================================');
    console.log('🔌 Socket.IO Started');
    console.log('🔔 Notification reminders scheduled');
    console.log('========================================');
});

process.on('SIGINT', () => {
    console.log('Server stopped.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Server terminated.');
    process.exit(0);
});