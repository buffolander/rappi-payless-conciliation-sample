const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, './.env') })

const ClientSFTP = require('ssh2-sftp-client')

const config = require('./config')

const { signIn, fetchPayments } = require('./rappi-requests')
const { processBodySchema, processHeaderSchema, defineSearchDates } = require('./utils')

const handler = async () => {
  const accessToken = await signIn()
  if (!accessToken) return console.error('unable to sign-in at Rappi')

  const {
    startDate: configStartDate,
    endDate: configEndDate,
    fileName,
    targetDirectory = '',
    extension = 'csv',
    defaultUnavailableData: defaultData = '',
    fieldSeparator: separator = ',',
    fileHeader = null,
    fileColumns,
  } = config
  const {
    labelProperties: labelFileHeaders = false,
    schema: headerSchema,
  } = fileHeader || {}
  const {
    labelProperties: labelColumnHeaders = false,
    schema: columnsSchema,
  } = fileColumns || {}

  // Setting query dates
  const { startDate, endDate } = configStartDate && configEndDate
    ? { startDate: configStartDate, endDate: configEndDate }
    : defineSearchDates(config)
  if (!startDate || !endDate) return

  // Extract
  const transactionData = await fetchPayments({ accessToken, startDate, endDate })

  // Transform
  const fileRows = transactionData.map(row => (
    processBodySchema(columnsSchema, row, defaultData).join(separator)
  )).join('\n')
  const columnHeaders = !labelColumnHeaders
    ? ''
    : columnsSchema.map(item => item.name).join(separator).concat('\n')

  const fileHeaderData = !headerSchema
    ? ''
    : processHeaderSchema(headerSchema, fileRows, defaultData, separator)
      .join(separator).concat('\n')
  const fileHeaders = !labelFileHeaders
    ? ''
    : headerSchema.map(item => item.name).join(separator).concat('\n')

  const fileBody = `${fileHeaders}${fileHeaderData}${columnHeaders}${fileRows}`
  const filePath = `${targetDirectory}/${fileName()}.${extension}`

  // Load
  const sftp = new ClientSFTP()
  const {
    SFTP_HOST,
    SFTP_PORT = 22,
    SFTP_USER,
    SFTP_PASSWORD,
  } = process.env
  try {
    await sftp.connect({
      host: SFTP_HOST,
      port: Number(SFTP_PORT),
      username: SFTP_USER,
      password: SFTP_PASSWORD,
      algorithms: { cipher: ['aes256-cbc'] },
    })
    const res = await sftp.put(Buffer.from(fileBody, 'utf-8'), filePath)
    console.info(res)
    return sftp.end()
  } catch (err) {
    return console.error(err)
  }
}

module.exports = { 'rappi-payless-conciliation': handler }
