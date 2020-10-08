const {
  countRecords,
  formatDate,
  mapEnums,
  parseAmount,
  sumRecords,
} = require('./utils')

module.exports = {
  frequency: 'daily', // enum: daily, weekly, monthly
  // * daily * fetches data from the previous day from 00:00:00 to 23:59:59
  // * weekly * fetches data from the previous full week, from MON to SUN
  // * monthly * fetches data from the previous full month
  scheduledTime: '02', // accepts the time in format 'HH'
  timezone: 'America/Bogota',
  // dayOfWeek applies only when frequency = weekly // enum: MON, TUE, WED, THU, FRI, SAT, SUN
  // dayOfWeek: 'MON',
  // dayOfMonth applies only when frequency = monthly // accepts the date in format 'DD'
  // dayOfMonth: '01',
  // startDate and endDate will override any frequency configuration
  // use it when you need to generate data for specific dates
  // startDate: '2020-09-21',
  // endDate: '2020-09-27',
  fileName: 'Rappi'.concat(formatDate(Date.now(), { dateFormat: 'YYYYMMDD' })),
  targetDirectory: '/upload',
  extension: 'txt',
  defaultUnavailableData: '0',
  fieldSeparator: '|',
  fileHeader: {
    labelProperties: false,
    schema: [{
      name: 'nit',
      default: '900843898',
    }, {
      name: 'fecha_archivo',
      default: formatDate(Date.now(), { dateFormat: 'YYYYMMDD' }),
    }, {
      name: 'registros',
      transform: {
        lambda: countRecords,
      },
    }, {
      name: 'valor_total',
      transform: {
        lambda: sumRecords,
        options: { index: 5 },
      },
    }],
  },
  fileRows: {
    labelProperties: false,
    schema: [{
      name: 'fecha',
      mapsTo: 'created_at',
      transform: {
        lambda: formatDate,
        options: { dateFormat: 'YYYYMMDD' },
      },
    }, {
      name: 'hora',
      mapsTo: 'created_at',
      transform: {
        lambda: formatDate,
        options: { dateFormat: 'HHmmss' },
      },
    }, {
      name: 'medio_de_pago',
      default: '01',
    }, {
      name: 'tipo_transaccion',
      mapsTo: 'transaction_type',
      transform: {
        lambda: mapEnums,
        options: { enums: { PURCHASE: '01', CANCELLATION: '02' } },
      },
    }, {
      name: 'autorizacion',
      mapsTo: 'authorization_code',
    }, {
      name: 'valor',
      mapsTo: 'amount',
      helpers: ['transaction_type'],
      transform: {
        lambda: parseAmount,
        options: { multiplier: 100, signChanger: 'CANCELLATION' },
      },
    }, {
      name: 'bin',
      default: '0',
    }, {
      name: 'orden',
      mapsTo: 'order_id',
    }, {
      name: 'cedula_cliente',
      default: '0',
    }, {
      name: 'terminal',
      mapsTo: 'terminal_id',
    }, {
      name: 'dependencia',
      mapsTo: 'store_id',
    }, {
      name: 'bolsillo',
      default: '02',
    }, {
      name: 'numero_transaccion',
      mapsTo: 'terminal_transaction_id',
    }, {
      name: 'cedula_rappitendero',
      default: '0',
    }],
  },
}
