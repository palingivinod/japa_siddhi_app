import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { initializeSocket } from './socket/socketServer';
import { initializeFirebase } from './firebase/firebase';
import { purgeDemoData } from './utils/demoData';
import { startNotificationReminderScheduler } from './modules/notification/notificationReminder.service';
import { syncRecentRazorpayDonations } from './modules/payments/razorpay.service';

// ✅ Initialize Firebase Admin BEFORE starting the server
initializeFirebase();

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);

// Keep-alive timeout > Render load balancer's 60s timeout to prevent 502 Bad Gateway under high load
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, '0.0.0.0', async () => {
    await purgeDemoData();
    await syncRecentRazorpayDonations();
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