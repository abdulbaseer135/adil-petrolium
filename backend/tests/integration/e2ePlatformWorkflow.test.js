'use strict';

/**
 * End-to-End Multi-Role Financial Platform Workflow & Security Audit Test
 *
 * Verifies:
 * 1. Super Admin bootstrap & setup
 * 2. Petrol Pump Admin registration & pending approval lifecycle
 * 3. Super Admin approval of station & admin
 * 4. Station Admin customer creation (AP-100) with opening balance
 * 5. Purchases and payment ledger updates & balance recalculation
 * 6. Customer self-registration with immutable 'customer' role
 * 7. Customer linking request to AP-100 & zero financial disclosure while pending
 * 8. Station Admin review & atomic approval of customer link
 * 9. Customer accessing transaction ledger & verified accounts receivable balance
 * 10. Multi-pump customer relationship (Pump A and Pump B) with complete ledger isolation
 * 11. IDOR, tenant boundary, and forged privilege attack resistance
 */

const { expect } = require('chai');
const request = require('supertest');
const app = require('../../src/server');
const User = require('../../src/models/User');
const PetrolPump = require('../../src/models/PetrolPump');
const CustomerPumpAccount = require('../../src/models/CustomerPumpAccount');
const CustomerLinkRequest = require('../../src/models/CustomerLinkRequest');
const Transaction = require('../../src/models/Transaction');
const config = require('../../src/config');
const { connectTestDB, clearDB, closeDB } = require('../helpers/db');

const applyAuth = (req, loginRes) => {
  const token = loginRes.body.data?._tokens?.accessToken || loginRes.body.data?.accessToken;
  const cookies = loginRes.headers['set-cookie'];
  if (cookies) {
    req.set('Cookie', cookies);
  }
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  return req;
};

describe('E2E Platform Workflow & Security Audit (Multi-Role Integration)', function () {
  this.timeout(30000);

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  after(async () => {
    await clearDB();
    await closeDB();
  });

  it('executes full end-to-end scenario across Super Admin, Pump Admin, and Customer roles', async () => {
    // ------------------------------------------------------------------------
    // Step 1: Super Admin One-Time Setup & Authentication
    // ------------------------------------------------------------------------
    const superAdminEmail = (config.superAdminEmail || 'superadmin@petro.local').toLowerCase();

    // Check setup status returns setupRequired: true
    const setupStatusRes = await request(app).get('/api/v1/auth/super-admin/setup-status');
    expect(setupStatusRes.status).to.equal(200);
    expect(setupStatusRes.body.data.setupRequired).to.be.true;

    // Reject setup with unauthorized email
    const badSetupRes = await request(app)
      .post('/api/v1/auth/super-admin/setup')
      .send({
        name: 'Hacker',
        email: 'hacker@malicious.local',
        password: 'Password@1234',
      });
    expect(badSetupRes.status).to.equal(403);

    // Valid Super Admin setup
    const setupRes = await request(app)
      .post('/api/v1/auth/super-admin/setup')
      .send({
        name: 'Chief Super Admin',
        email: superAdminEmail,
        password: 'SuperPassword@1234',
        phone: '03001112233',
      });
    expect(setupRes.status).to.equal(201);
    expect(setupRes.body.data.role).to.equal('super_admin');

    // Subsequent setup must fail (403)
    const duplicateSetupRes = await request(app)
      .post('/api/v1/auth/super-admin/setup')
      .send({
        name: 'Imposter',
        email: superAdminEmail,
        password: 'SuperPassword@1234',
      });
    expect(duplicateSetupRes.status).to.equal(403);

    // Super Admin login
    const superAdminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: superAdminEmail,
        password: 'SuperPassword@1234',
      });
    expect(superAdminLoginRes.status).to.equal(200);

    // ------------------------------------------------------------------------
    // Step 2: New Petrol Pump Admin Registers Station A
    // ------------------------------------------------------------------------
    const pumpAdminARegRes = await request(app)
      .post('/api/v1/auth/register/admin')
      .send({
        name: 'Station Admin Alpha',
        email: 'admin.alpha@pumpstation.local',
        password: 'AdminPassword@1234',
        phone: '03002223344',
        pumpName: 'Alpha Petro Services',
        city: 'Lahore',
        address: 'Main Boulevard, Gulberg III',
      });
    expect(pumpAdminARegRes.status).to.equal(201);
    expect(pumpAdminARegRes.body.data.user.role).to.equal('admin');
    expect(pumpAdminARegRes.body.data.user.status).to.equal('pending');
    const pumpA = pumpAdminARegRes.body.data.pump || pumpAdminARegRes.body.data.petrolPump;
    expect(pumpA.status).to.equal('pending');
    const pumpAId = pumpA._id || pumpA.id;

    // Unapproved admin cannot log in or access tenant operations
    const pendingLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.alpha@pumpstation.local',
        password: 'AdminPassword@1234',
      });
    expect(pendingLoginRes.status).to.equal(403);
    expect(pendingLoginRes.body.code).to.equal('ACCOUNT_PENDING');

    // ------------------------------------------------------------------------
    // Step 3: Super Admin Approves Station A
    // ------------------------------------------------------------------------
    const approvePumpAReq = request(app).patch(`/api/v1/super-admin/petrol-pumps/${pumpAId}/approve`);
    applyAuth(approvePumpAReq, superAdminLoginRes);
    const approvePumpARes = await approvePumpAReq;
    expect(approvePumpARes.status).to.equal(200);
    expect(approvePumpARes.body.data.status).to.equal('approved');

    // Admin A can now log in successfully
    const adminALoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.alpha@pumpstation.local',
        password: 'AdminPassword@1234',
      });
    expect(adminALoginRes.status).to.equal(200);

    // ------------------------------------------------------------------------
    // Step 4: Admin A Creates Customer Business Account AP-100 with Opening Balance
    // ------------------------------------------------------------------------
    const createCustReq = request(app).post('/api/v1/customers');
    applyAuth(createCustReq, adminALoginRes);
    const createCustRes = await createCustReq.send({
      name: 'Ahmed Transport Co',
      customerCode: 'AP-100',
      phone: '03009998877',
      creditLimit: 200000,
      openingBalance: 50000,
      address: 'Truck Terminal, Lahore',
    });
    expect(createCustRes.status).to.equal(201);
    expect(createCustRes.body.data.customerCode).to.equal('AP-100');
    expect(createCustRes.body.data.currentBalance).to.equal(50000);
    const custAccountId = createCustRes.body.data.id || createCustRes.body.data._id;

    // Verify opening balance transaction was created
    const openingTx = await Transaction.findOne({ customerId: custAccountId, transactionType: 'opening_balance' });
    expect(openingTx).to.exist;
    expect(openingTx.totalAmount).to.equal(50000);
    expect(openingTx.updatedBalance).to.equal(50000);

    // ------------------------------------------------------------------------
    // Step 5: Admin A Records Two Purchases & One Payment
    // ------------------------------------------------------------------------
    // Purchase 1: 100 liters of PMG @ 250 = 25,000
    const tx1Req = request(app).post('/api/v1/transactions');
    applyAuth(tx1Req, adminALoginRes);
    const tx1Res = await tx1Req.send({
      customerId: custAccountId,
      transactionType: 'fuel_sale',
      fuelType: 'pmg',
      fuelQuantity: 100,
      rate: 250,
      notes: 'Delivery truck #1 fillup',
    });
    expect(tx1Res.status).to.equal(201);
    expect(tx1Res.body.data.totalAmount).to.equal(25000);
    expect(tx1Res.body.data.previousBalance).to.equal(50000);
    expect(tx1Res.body.data.updatedBalance).to.equal(75000);

    // Purchase 2: 80 liters of HSD @ 275 = 22,000
    const tx2Req = request(app).post('/api/v1/transactions');
    applyAuth(tx2Req, adminALoginRes);
    const tx2Res = await tx2Req.send({
      customerId: custAccountId,
      transactionType: 'fuel_sale',
      fuelType: 'hsd',
      fuelQuantity: 80,
      rate: 275,
      notes: 'Delivery truck #2 fillup',
    });
    expect(tx2Res.status).to.equal(201);
    expect(tx2Res.body.data.totalAmount).to.equal(22000);
    expect(tx2Res.body.data.previousBalance).to.equal(75000);
    expect(tx2Res.body.data.updatedBalance).to.equal(97000);

    // Payment: 35,000 received
    const tx3Req = request(app).post('/api/v1/transactions');
    applyAuth(tx3Req, adminALoginRes);
    const tx3Res = await tx3Req.send({
      customerId: custAccountId,
      transactionType: 'payment',
      paymentReceived: 35000,
      notes: 'Bank transfer receipt #BT-8821',
    });
    expect(tx3Res.status).to.equal(201);
    expect(tx3Res.body.data.paymentReceived).to.equal(35000);
    expect(tx3Res.body.data.previousBalance).to.equal(97000);
    // Expected updated balance: 97,000 - 35,000 = 62,000
    expect(tx3Res.body.data.updatedBalance).to.equal(62000);

    // Verify current balance on CustomerPumpAccount is 62,000
    const verifiedAccountA = await CustomerPumpAccount.findById(custAccountId);
    expect(verifiedAccountA.currentBalance).to.equal(62000);

    // ------------------------------------------------------------------------
    // Step 6: Customer Ahmed Self-Registers
    // ------------------------------------------------------------------------
    const custRegisterRes = await request(app)
      .post('/api/v1/auth/register/customer')
      .send({
        name: 'Ahmed Transport',
        email: 'ahmed@transportlogistics.local',
        password: 'CustomerPassword@1234',
        phone: '03009998877',
        role: 'super_admin', // Privilege escalation attempt
      });
    expect(custRegisterRes.status).to.equal(201);
    expect(custRegisterRes.body.data.role).to.equal('customer'); // Escalation rejected

    // Customer logs in
    const custLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ahmed@transportlogistics.local',
        password: 'CustomerPassword@1234',
      });
    expect(custLoginRes.status).to.equal(200);

    // ------------------------------------------------------------------------
    // Step 7: Customer Ahmed Selects Pump A & Requests Link to AP-100
    // ------------------------------------------------------------------------
    // Customer views available pumps
    const publicPumpsReq = request(app).get('/api/v1/customer/pumps/available');
    applyAuth(publicPumpsReq, custLoginRes);
    const publicPumpsRes = await publicPumpsReq;
    expect(publicPumpsRes.status).to.equal(200);
    expect(publicPumpsRes.body.data).to.be.an('array');
    const pumpEntry = publicPumpsRes.body.data.find((p) => String(p._id) === String(pumpAId));
    expect(pumpEntry).to.exist;
    expect(pumpEntry.name).to.equal('Alpha Petro Services');
    // Ensure sensitive admin credentials are NOT leaked in public list
    expect(pumpEntry.businessEmail).to.be.undefined;
    expect(pumpEntry.admins).to.be.undefined;

    // Customer submits link request for AP-100
    const linkReqReq = request(app).post('/api/v1/customer/pumps/link-request');
    applyAuth(linkReqReq, custLoginRes);
    const linkReqRes = await linkReqReq.send({
      petrolPumpId: pumpAId,
      requestType: 'existing_account',
      customerCode: 'AP-100',
      phone: '03009998877',
    });
    expect(linkReqRes.status).to.equal(201);
    expect(linkReqRes.body.data.status).to.equal('pending');
    // Verify no financial details are leaked in the link request response
    expect(linkReqRes.body.data.currentBalance).to.be.undefined;
    expect(linkReqRes.body.data.creditLimit).to.be.undefined;
    const linkRequestId = linkReqRes.body.data.id || linkReqRes.body.data._id;

    // Customer CANNOT access AP-100 ledger while pending
    const prematureAccessReq = request(app).get(`/api/v1/customer/pumps/${custAccountId}`);
    applyAuth(prematureAccessReq, custLoginRes);
    const prematureAccessRes = await prematureAccessReq;
    expect(prematureAccessRes.status).to.equal(403);

    // ------------------------------------------------------------------------
    // Step 8: Station Admin Reviews & Approves Link Request
    // ------------------------------------------------------------------------
    // Admin lists pending requests
    const adminListReqReq = request(app).get('/api/v1/admin/customer-links?status=pending');
    applyAuth(adminListReqReq, adminALoginRes);
    const adminListReqRes = await adminListReqReq;
    expect(adminListReqRes.status).to.equal(200);
    expect(adminListReqRes.body.data.requests).to.be.an('array');
    expect(adminListReqRes.body.data.requests.length).to.be.at.least(1);

    // Admin approves the request
    const adminApproveReq = request(app).patch(`/api/v1/admin/customer-links/${linkRequestId}/approve`);
    applyAuth(adminApproveReq, adminALoginRes);
    const adminApproveRes = await adminApproveReq.send({});
    expect(adminApproveRes.status).to.equal(200);
    expect(adminApproveRes.body.data.status).to.equal('approved');

    // ------------------------------------------------------------------------
    // Step 9: Customer Sees Approved Pump Card & Historical Financial Ledger
    // ------------------------------------------------------------------------
    // Customer views linked pumps
    const myPumpsReq = request(app).get('/api/v1/customer/pumps/my-accounts');
    applyAuth(myPumpsReq, custLoginRes);
    const myPumpsRes = await myPumpsReq;
    expect(myPumpsRes.status).to.equal(200);
    expect(myPumpsRes.body.data).to.be.an('array');
    const linkedPumpA = myPumpsRes.body.data.find((p) => String(p.petrolPumpId?._id || p.petrolPumpId) === String(pumpAId));
    expect(linkedPumpA).to.exist;
    expect(linkedPumpA.customerCode).to.equal('AP-100');
    expect(linkedPumpA.currentBalance).to.equal(62000);

    // Customer opens AP-100 details
    const accountDetailReq = request(app).get(`/api/v1/customer/pumps/${custAccountId}`);
    applyAuth(accountDetailReq, custLoginRes);
    const accountDetailRes = await accountDetailReq;
    expect(accountDetailRes.status).to.equal(200);
    expect(accountDetailRes.body.data.account.currentBalance).to.equal(62000);
    expect(accountDetailRes.body.data.account.creditLimit).to.equal(200000);

    // Customer views transactions
    const custTxReq = request(app).get(`/api/v1/customer/pumps/${custAccountId}/transactions`);
    applyAuth(custTxReq, custLoginRes);
    const custTxRes = await custTxReq;
    expect(custTxRes.status).to.equal(200);
    expect(custTxRes.body.data).to.be.an('array');
    // Must contain opening balance + 2 fuel sales + 1 payment = 4 transactions
    expect(custTxRes.body.data.length).to.equal(4);

    // ------------------------------------------------------------------------
    // Step 10: Multi-Pump Linking - Customer Connects Station B
    // ------------------------------------------------------------------------
    // Create Station B
    const pumpAdminBRegRes = await request(app)
      .post('/api/v1/auth/register/admin')
      .send({
        name: 'Station Admin Beta',
        email: 'admin.beta@pumpstation.local',
        password: 'AdminPassword@1234',
        phone: '03003334455',
        pumpName: 'Beta Fuel Express',
        city: 'Islamabad',
        address: 'Blue Area, Sector F-6',
      });
    const pumpB = pumpAdminBRegRes.body.data.pump || pumpAdminBRegRes.body.data.petrolPump;
    const pumpBId = pumpB._id || pumpB.id;

    // Super Admin approves Station B
    const approvePumpBReq = request(app).patch(`/api/v1/super-admin/petrol-pumps/${pumpBId}/approve`);
    applyAuth(approvePumpBReq, superAdminLoginRes);
    await approvePumpBReq;

    // Admin B logs in
    const adminBLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.beta@pumpstation.local',
        password: 'AdminPassword@1234',
      });
    expect(adminBLoginRes.status).to.equal(200);

    // Customer Ahmed requests a NEW relationship with Pump B
    const linkReqBReq = request(app).post('/api/v1/customer/pumps/link-request');
    applyAuth(linkReqBReq, custLoginRes);
    const linkReqBRes = await linkReqBReq.send({
      petrolPumpId: pumpBId,
      requestType: 'new_relationship',
      notes: 'Opening accounts for Islamabad fleet',
    });
    expect(linkReqBRes.status).to.equal(201);
    const linkReqBId = linkReqBRes.body.data.id || linkReqBRes.body.data._id;

    // Admin B approves and assigns customer code BP-501 with 15,000 opening balance
    const approveBReq = request(app).patch(`/api/v1/admin/customer-links/${linkReqBId}/approve`);
    applyAuth(approveBReq, adminBLoginRes);
    const approveBRes = await approveBReq.send({
      customerCode: 'BP-501',
      creditLimit: 300000,
      openingBalance: 15000,
    });
    expect(approveBRes.status).to.equal(200);
    const custAccountBId = approveBRes.body.data.account._id;

    // Customer now has TWO separate accounts
    const myPumpsBothReq = request(app).get('/api/v1/customer/pumps/my-accounts');
    applyAuth(myPumpsBothReq, custLoginRes);
    const myPumpsBothRes = await myPumpsBothReq;
    expect(myPumpsBothRes.status).to.equal(200);
    expect(myPumpsBothRes.body.data.length).to.equal(2);

    const pumpAAcc = myPumpsBothRes.body.data.find((p) => String(p.petrolPumpId?._id || p.petrolPumpId) === String(pumpAId));
    const pumpBAcc = myPumpsBothRes.body.data.find((p) => String(p.petrolPumpId?._id || p.petrolPumpId) === String(pumpBId));

    expect(pumpAAcc.customerCode).to.equal('AP-100');
    expect(pumpAAcc.currentBalance).to.equal(62000);

    expect(pumpBAcc.customerCode).to.equal('BP-501');
    expect(pumpBAcc.currentBalance).to.equal(15000);

    // Pump A transactions DO NOT appear in Pump B transactions
    const pumpBTxReq = request(app).get(`/api/v1/customer/pumps/${custAccountBId}/transactions`);
    applyAuth(pumpBTxReq, custLoginRes);
    const pumpBTxRes = await pumpBTxReq;
    expect(pumpBTxRes.status).to.equal(200);
    expect(pumpBTxRes.body.data.length).to.equal(1); // Only opening balance
    expect(pumpBTxRes.body.data[0].transactionType).to.equal('opening_balance');
    expect(pumpBTxRes.body.data[0].totalAmount).to.equal(15000);

    // ------------------------------------------------------------------------
    // Step 11: Deliberate Security & IDOR Attack Verification
    // ------------------------------------------------------------------------
    // Attack 1: Customer B registers and tries to access Customer Ahmed's AP-100 account
    await request(app)
      .post('/api/v1/auth/register/customer')
      .send({
        name: 'Attacker Customer',
        email: 'attacker@evil.local',
        password: 'Password@1234',
        phone: '03004445566',
      });
    const attackerLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'attacker@evil.local',
        password: 'Password@1234',
      });

    const idorAccountReq = request(app).get(`/api/v1/customer/pumps/${custAccountId}`);
    applyAuth(idorAccountReq, attackerLoginRes);
    const idorAccountRes = await idorAccountReq;
    expect(idorAccountRes.status).to.equal(403);

    const idorTxReq = request(app).get(`/api/v1/customer/pumps/${custAccountId}/transactions`);
    applyAuth(idorTxReq, attackerLoginRes);
    const idorTxRes = await idorTxReq;
    expect(idorTxRes.status).to.equal(403);

    // Attack 2: Admin A attempts to create a transaction on Pump B's customer account
    const crossPumpTxReq = request(app).post('/api/v1/transactions');
    applyAuth(crossPumpTxReq, adminALoginRes);
    const crossPumpTxRes = await crossPumpTxReq.send({
      customerId: custAccountBId,
      transactionType: 'fuel_sale',
      fuelType: 'pmg',
      fuelQuantity: 10,
      rate: 250,
    });
    expect(crossPumpTxRes.status).to.equal(403);

    // Attack 3: Admin A attempts to export statement for Pump B's customer
    const crossPumpStatementReq = request(app).get(`/api/v1/reports/export/admin-statement-excel?customerId=${custAccountBId}`);
    applyAuth(crossPumpStatementReq, adminALoginRes);
    const crossPumpStatementRes = await crossPumpStatementReq;
    expect(crossPumpStatementRes.status).to.equal(403);

    // Attack 4: Duplicate link request from same customer for same pump
    const dupLinkReqReq = request(app).post('/api/v1/customer/pumps/link-request');
    applyAuth(dupLinkReqReq, custLoginRes);
    const dupLinkReqRes = await dupLinkReqReq.send({
      petrolPumpId: pumpAId,
      requestType: 'existing_account',
      customerCode: 'AP-100',
    });
    expect(dupLinkReqRes.status).to.equal(400); // Already linked or pending
  });
});
