'use strict';

const dailyService = require('../services/dailyRecordService');
const DailyRecord = require('../models/DailyRecord');
const { sendSuccess } = require('../utils/apiResponse');

const getPkDate = () => new Date().toLocaleDateString('en-CA');

const getOrCreate = async (req, res, next) => {
  try {
    const date = req.query.date || getPkDate();
    const record = await dailyService.getOrCreateDailyRecord(date, req.user._id);
    return sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
};

const getToday = async (req, res, next) => {
  try {
    const today = getPkDate();
    const record = await dailyService.getOrCreateDailyRecord(today, req.user._id);
    return sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
};

const lockRecord = async (req, res, next) => {
  try {
    const record = await dailyService.lockDailyRecord({
      recordId: req.params.id,
      lockedBy: req.user._id,
      requestId: req.id,
    });
    return sendSuccess(res, record, 'Daily record locked');
  } catch (err) {
    next(err);
  }
};

const listRecords = async (req, res, next) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const total = await DailyRecord.countDocuments();
    const records = await DailyRecord.find()
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .populate('lockedBy', 'name email')
      .lean();

    return sendSuccess(
      res,
      records,
      'Daily records retrieved',
      200,
      {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      }
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrCreate,
  getToday,
  lockRecord,
  listRecords,
};