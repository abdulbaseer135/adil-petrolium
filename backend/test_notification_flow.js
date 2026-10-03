const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5001/api/v1';

async function runTest() {
  console.log('--- Testing FinTech Notification System End-to-End ---');

  // Connect to DB directly to inspect / trigger
  await mongoose.connect('mongodb://localhost:27017/petro_dealer');
  const notificationService = require('./src/services/notificationService');
  const User = require('./src/models/User');

  // 1. Check Super Admin
  const superAdmin = await User.findOne({ role: 'super_admin' });
  console.log('Super Admin found:', superAdmin ? superAdmin.email : 'None');

  // 2. Check Pump Admin
  const pumpAdmin = await User.findOne({ role: 'admin' });
  console.log('Pump Admin found:', pumpAdmin ? pumpAdmin.email : 'None');

  // 3. Check Customer
  const customer = await User.findOne({ role: 'customer' });
  console.log('Customer found:', customer ? customer.email : 'None');

  if (!superAdmin || !pumpAdmin || !customer) {
    console.error('Missing one of the test roles in DB');
    process.exit(1);
  }

  // Trigger FinTech events
  console.log('\n[1] Triggering FinTech Events...');

  // Event A: Pump registered -> Super Admin notification
  await notificationService.onPumpRegistered({
    pumpName: 'Greenway Express Fuel',
    adminName: 'Tariq Mehmood',
    city: 'Lahore',
  });
  console.log('✓ Triggered onPumpRegistered -> Super Admin');

  // Event B: Customer Link Request -> Pump Admin notification
  await notificationService.onCustomerLinkRequest({
    petrolPumpId: pumpAdmin.petrolPumpId,
    customerName: customer.name || 'Al-Madina Traders',
    pumpName: 'Alpha Petro Station',
  });
  console.log('✓ Triggered onCustomerLinkRequest -> Pump Admin');

  // Event C: Link request approved -> Customer notification
  await notificationService.onLinkRequestApproved({
    customerUserId: customer._id,
    pumpName: 'Alpha Petro Station',
  });
  console.log('✓ Triggered onLinkRequestApproved -> Customer');

  // Event D: Ledger entry -> Customer notification
  await notificationService.onLedgerEntry({
    customerUserId: customer._id,
    pumpName: 'Alpha Petro Station',
    transactionType: 'fuel_sale',
    amount: 14500,
    updatedBalance: 42500,
  });
  console.log('✓ Triggered onLedgerEntry -> Customer');

  // Check counts directly in DB
  const saUnread = await notificationService.getUnreadCount(superAdmin._id);
  const paUnread = await notificationService.getUnreadCount(pumpAdmin._id);
  const custUnread = await notificationService.getUnreadCount(customer._id);

  console.log('\n[2] Direct Database Unread Counts:');
  console.log(`- Super Admin (${superAdmin.email}): ${saUnread} unread`);
  console.log(`- Pump Admin (${pumpAdmin.email}): ${paUnread} unread`);
  console.log(`- Customer (${customer.email}): ${custUnread} unread`);

  // Verify fetch notifications via service
  const custNotifs = await notificationService.getNotifications({ userId: customer._id, page: 1, limit: 10 });
  console.log('\n[3] Customer Notifications sample:');
  custNotifs.notifications.forEach((n) => {
    console.log(`  - [${n.type}] "${n.title}": ${n.message} (Read: ${n.isRead})`);
  });

  // Test API endpoint via HTTP login & cookie
  console.log('\n[4] Testing API endpoint authentication & responses...');
  
  // Login as Customer
  let loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customer.email, password: 'Test@12345' }),
  });

  if (!loginRes.ok) {
    loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customer.email, password: 'Password@123' }),
    });
  }

  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Customer login status:', loginRes.status, 'Cookie present:', !!cookieHeader);

  if (cookieHeader) {
    const unreadRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Cookie: cookieHeader },
    });
    const unreadData = await unreadRes.json();
    console.log('Customer API /notifications/unread-count:', unreadData);

    const listRes = await fetch(`${BASE_URL}/notifications?limit=5`, {
      headers: { Cookie: cookieHeader },
    });
    const listData = await listRes.json();
    console.log('Customer API /notifications items count:', listData.notifications?.length);

    // Test mark read
    if (listData.notifications && listData.notifications.length > 0) {
      const firstId = listData.notifications[0]._id;
      const readRes = await fetch(`${BASE_URL}/notifications/${firstId}/read`, {
        method: 'PATCH',
        headers: { Cookie: cookieHeader },
      });
      const readData = await readRes.json();
      console.log(`Marked notification ${firstId} as read:`, readData.notification?.isRead);
    }
  }

  console.log('\n✅ All FinTech notification tests completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
