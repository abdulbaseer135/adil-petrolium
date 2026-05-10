'use strict';
const crypto = require('crypto');

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SEGMENT_LENGTH = 6;
const SEGMENTS = 4;

const generateSegment = () => {
  const bytes = crypto.randomBytes(SEGMENT_LENGTH);
  let segment = '';

  for (const byte of bytes) {
    segment += CHARSET[byte % CHARSET.length];
  }

  return segment;
};

const generateRecoveryKey = () => Array.from({ length: SEGMENTS }, generateSegment).join('-');

module.exports = generateRecoveryKey;