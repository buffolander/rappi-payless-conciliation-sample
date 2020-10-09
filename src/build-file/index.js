const FTP = require('ftp')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, './.env') })

const config = require('./config')

const { signIn, fetchPayments } = require('./rappi-requests')
const { processRowSchema, processHeaderSchema, defineSearchDates } = require('./utils')

const handler = async () => {
  const accessToken = await signIn()
  if (!accessToken) return console.error('unable to sign-in at Rappi')

  const {
    startDate: configStartDate,
    endDate: configEndDate,
    fileName,
    targetDirectory = '/',
    extension = 'csv',
    defaultUnavailableData: defaultData = '',
    fieldSeparator: separator = ',',
    fileHeader = null,
    fileRows,
  } = config
  const {
    labelProperties: labelFileHeaders = false,
    schema: headerSchema,
  } = fileHeader || {}
  const {
    labelProperties: labelColumnHeaders = false,
    schema: rowSchema,
  } = fileRows || {}

  const { startDate, endDate } = configStartDate && configEndDate
    ? { startDate: configStartDate, endDate: configEndDate }
    : defineSearchDates(config)
  if (!startDate || !endDate) return

  const transactionData = await fetchPayments({ accessToken, startDate, endDate })
  const fileRowsData = transactionData.map(row => (
    processRowSchema(rowSchema, row, defaultData).join(separator)
  )).join('\n')
  const columnHeaders = !labelColumnHeaders
    ? ''
    : rowSchema.map(item => item.name).join(separator).concat('\n')

  const fileHeaderData = !headerSchema
    ? ''
    : processHeaderSchema(headerSchema, fileRowsData, defaultData, separator)
      .join(separator).concat('\n')
  const fileHeaders = !labelFileHeaders
    ? ''
    : headerSchema.map(item => item.name).join(separator).concat('\n')

  const fileBody = `${fileHeaders}${fileHeaderData}${columnHeaders}${fileRowsData}`
  const filePath = `${targetDirectory}/${fileName}${extension}`

  const {
    SFTP_HOST,
    SFTP_PORT = 22,
    SFTP_USER,
    SFTP_PASSWORD,
  } = process.env
  const ftpClient = new FTP()
  ftpClient
    .on('ready', () => {
      ftpClient.put(Buffer.from(fileBody, 'utf-8'), filePath, (err) => {
        if (err) throw err
        ftpClient.end()
      })
    })
  ftpClient.connect({
    host: SFTP_HOST,
    port: SFTP_PORT,
    user: SFTP_USER,
    password: SFTP_PASSWORD,
  })
}

module.exports = { 'rappi-payless-conciliation': handler }
