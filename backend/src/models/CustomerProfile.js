'use strict';
const mongoose = require('mongoose');
const CustomerPumpAccount = require('./CustomerPumpAccount');

if (!mongoose.models.CustomerProfile) {
  mongoose.model('CustomerProfile', CustomerPumpAccount.schema, 'customerpumpaccounts');
}

module.exports = CustomerPumpAccount;