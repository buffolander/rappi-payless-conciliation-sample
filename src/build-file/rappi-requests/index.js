const axios = require('axios')
const qs = require('qs')

const {
  RAPPI_BASEURL,
  RAPPI_SIGNIN_URI,
  RAPPI_GET_PAYMENTS_URI,
  RAPPI_RETAILER_ID,
  RAPPI_RETAILER_SECRET,
} = process.env

module.exports.signIn = async () => {
  const credentials = {
    retailer: RAPPI_RETAILER_ID,
    secret: RAPPI_RETAILER_SECRET,
  }
  try {
    const response = await axios.post(
      RAPPI_BASEURL.concat(RAPPI_SIGNIN_URI),
      credentials,
    )
    const {
      status,
      data,
    } = response
    if (status === 200) return data.accessToken
    return null
  } catch (err) {
    return null
  }
}

const fetchData = async ({
  accessToken,
  startDate,
  endDate,
  nextPage = null,
}, acc = []) => {
  const url = RAPPI_BASEURL.concat(RAPPI_GET_PAYMENTS_URI)
  const nextPageParams = nextPage ? nextPage.split('?')[1] : ''
  const params = {
    ...qs.parse(nextPageParams),
    start_date: startDate,
    end_date: endDate,
    limit: 10,
  }
  const headers = {
    authorization: accessToken,
  }
  try {
    const response = await axios.get(url, { headers, params })
    const { status, data: rawData } = response
    if (status !== 200) return acc

    const { data, links: paginationLinks = {} } = rawData
    const { next_page: nextPageLink } = paginationLinks
    if (data.length === 0) return acc

    const res = data.reduce((acc0, cur0) => (
      [...acc0, ...cur0.transactions.reduce((acc1, cur1) => (
        [...acc1, { ...cur1, order_id: cur0.order_id }]
      ), [])]
    ), [])
    if (!nextPageLink) return [...acc, ...res]

    return fetchData({
      accessToken,
      startDate,
      endDate,
      nextPage: nextPageLink,
    }, [...acc, ...res])
  } catch (err) {
    return acc
  }
}

module.exports.fetchPayments = fetchData
