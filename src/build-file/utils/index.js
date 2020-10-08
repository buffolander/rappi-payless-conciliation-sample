/* eslint-disable no-nested-ternary */
const get = require('lodash/get')
const empty = require('lodash/isEmpty')
const pick = require('lodash/pick')
const m = require('moment-timezone')

module.exports.formatDate = (value, { dateFormat }) => (m(value).format(dateFormat))

module.exports.mapEnums = (value, { enums = {} }) => (enums[value] || null)

module.exports.parseAmount = (value, {
  multiplier = 1,
  signChanger = '',
  helpers,
}) => {
  const { transaction_type: transactionType } = helpers
  return value * multiplier * (transactionType === signChanger ? -1 : 1)
}

module.exports.countRecords = (value) => {
  const records = value.split('\n')
  return empty(records[0]) ? 0 : records.length
}

module.exports.sumRecords = (value, { index, separator }) => {
  const records = value.split('\n')
  return empty(records[0]) ? 0 : records.reduce(
    (acc, cur) => (acc + Number(cur.split(separator)[index])), 0,
  )
}

module.exports.processRowSchema = (schema, data, defaultData) => (
  schema.reduce((acc, cur) => (
    [...acc, cur.default
      ? cur.default
      : (cur.mapsTo && !cur.transform)
        ? get(data, cur.mapsTo)
        : cur.transform
          ? cur.transform.lambda(get(data, cur.mapsTo), {
            ...cur.transform.options,
            helpers: cur.helpers ? pick(data, cur.helpers) : null,
          })
          : defaultData,
    ]
  ), [])
)

module.exports.processHeaderSchema = (schema, data, defaultData, separator) => (
  schema.reduce((acc, cur) => (
    [...acc, cur.default
      ? cur.default
      : (cur.mapsTo && !cur.transform)
        ? get(data, cur.mapsTo)
        : cur.transform
          ? cur.transform.lambda(data, {
            ...cur.transform.options,
            separator,
          })
          : defaultData,
    ]
  ), [])
)

module.exports.defineSearchDates = ({
  frequency,
  scheduledTime,
  timezone,
  dayOfWeek,
  dayOfMonth,
}) => {
  const today = m.tz(Date.now(), timezone)
  const format = 'YYYY-MM-DD'
  if (scheduledTime && today.format('HH') !== scheduledTime) return {}

  switch (frequency) {
    case 'daily':
      return {
        startDate: today.subtract(1, 'day').startOf('day').format(format),
        endDate: today.startOf('day').format(format),
      }
    case 'weekly':
      if (dayOfWeek && today.format('ddd').toUpperCase() !== dayOfWeek) return {}
      return {
        startDate: today.startOf('week').subtract(6, 'days').format(format),
        endDate: today.endOf('week').add(1, 'day').format(format),
      }
    case 'monthly':
      if (dayOfMonth && today.format('dd').toUpperCase() !== dayOfMonth) return {}
      return {
        startDate: today.subtract(1, 'month').startOf('month').format(format),
        endDate: today.endOf('month').format(format),
      }
    default:
      return {}
  }
}
