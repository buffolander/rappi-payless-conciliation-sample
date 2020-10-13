# Rappi Payless v3 Conciliation ETL

This is a flexible ETL script commonly used by retailers when reconciling transactions from their integrations with Rappi Payless.

It's configurable enough to allow...

1. ... consuming Rappi Payless v3 API to extract transactions data for different time frames: daily, weekly, monthly or custom dates, as well as specifying the when the script should run and your local timezone;

2. ... transforming the raw data received from Rappi to comply with your conciliation file schema and conventions;

3. ... loading the data to your FTP server.

## Setting up your `env` file

The `.env` file located in `/src/build-file/.env`, is your single source for static configurations.

There are two types of configuration to be setup in this file: (1) your Rappi credentials and (2) access details to your SFTP server.

You must replace the question mark for actual values on each on these environment variables:

```
# /src/build-file/.env

RAPPI_RETAILER_ID=?
RAPPI_RETAILER_SECRET=?

SFTP_HOST=?
SFTP_PORT=22
SFTP_USER=?
SFTP_PASSWORD=?
```

## Setting up your `config.js` file

The `/src/build-file/config.js` is the core of your ETL. It allows you to customize fully customize your data extraction, transformation and load.

### Time frame properties

Transactions can be queried in a daily, weekly or monthly basis. Your frequency option is established by the `frequency` property.

It's also possible to query transactions based custom dates. It enables the script to establish the initial and final dates sent on the http request to Rappi.

**IMPORTANT!**

1. Whatever the chosen frequency, `timezone` is always a required property. It allows transactions' timestamps to be adjusted to you local time.

2. Whenever the `startDate` and `endDate` properties are configured, the script will perform a custom query and all other time frame properties in `config.js` will be ignored.

3. If `frequency` is declared (whatever the value it holds), you must also specify `scheduledTime`. This property tells the script the hour it should be executed.

`frequency: daily` no additional properties required.

`frequency: weekly` additional properties: `dayOfWeek` (string); enum: MON, TUE, WED, THU, FRI, SAT, SUN.

`frequency: monthly` additional properties: `dayOfMonth` (string); accepts the date in format 'DD'.

### **Your file conventions**

File conventions are properties that allow you to define:

1. The file name mask. Property `fileName` (function);

2. The target directory in your server. Property `targetDirectory` (string);

3. The extension applied to the file. Property `extension` (string);

4. The default value for unavailable data. Property: `defaultUnavailableData` (string | number);

5. The character used for separating columns. Property: `fieldSeparator` (string).

### **Transformation functions**

Transformation functions have slightly different applications in file headers and bodies, but the overall behavior is the same. They take two arguments: `value` (any) and `options` (object).

In the file header transformation functions work as aggregators. The `value` argument will always be the file body.

For columns in the file body, transformation functions will change the data a column is mapped against in Rappi's response schema. This transformation maybe as simple as formatting a date or time field, or assigning new values to enumerables, or as complex as you need it to be.

The `value` argument will always take as input the property outlined in `mapsTo`. It must map to properties in the Rappi Payless v3 listPayments [response schema](https://app.swaggerhub.com/apis/rappi-docs/cpg-public-api/v3#/Payments/listPayments).

The `options` argument includes function-specific processing instructions, such as the formatting mask in `formatDate` or que index for the column being aggregated in `sumRecords`.

The script includes two built-in transformation functions for the file header, `countRecords` and `sumRecords`; and three, for columns in the file body. You may implement new ones creating your functions and linking them to the schemas in `config.js`.

```javascript
// Aggregation function example: header aggregation
module.exports.sumRecords = (value, {
  index,
  separator,
}) => {
  const records = value.split('\n')
  return empty(records[0]) ? 0 : records.reduce(
    (acc, cur) => (acc + Number(cur.split(separator)[index])), 0,
  )
}

// File body, column transformation example
const m = require('moment-timezone')

const formatDate = (value, {
  dateFormat,
  timezone = null,
}) => (timezone
  ? m.tz(value, timezone).format(dateFormat)
  : m(value).format(dateFormat)
)
```

### **File header**

File header properties are used for aggregating transactions exported to the file. It's an option not often used by retailers. In case you don't required any aggregation in your conciliation files, `fileHeader` might be omitted from your `config.js` file.

It has two top-level properties: `labelProperties` (boolean) is a switch to show or hide labels in the header properties; and the `schema` (array) holds all file header fields and their values.

Each header field require a `name` property. It's the printed label value when `labelProperties === true`.

The header object also requires either a `default` or `transform` property.

The `default` property accepts a static value or a function that doesn't take no transaction data (fileColumns data) as input.

The `transform` property is an object that specifies how `fileColumns` data should be aggregated. This object requires a `lambda` property which is your aggregation function, and it also takes an non-required `options` property. The script takes an `options` property and applies it to the related `lambda` as its second argument.

### **File body**

You'll notice a similar structure in the `fileColumns` property. The noticeable difference lies in the `schema`. Each object in this collection represents a column in your file body.

There are straightforward mappings to data returned by Rappi or to static values...

```javascript
    }, { // mapping without transformation
      name: 'numero_transaccion',
      mapsTo: 'terminal_transaction_id',
    }, { // always assign an static value
      name: 'cedula_rappitendero',
      default: '0',
    }],
```

Next in complexity order are transformations. The `value` argument for a transformation function will always be the data mapped in the property `mapsTo`. In the following example, when the script is executed it will pass the `created_at` value of each transaction returned by Rappi and pass on to the `formatDate` function. This function will also ingest the `dateFormat` and `timezone` options to compute the return value.

```javascript
    }, {
      name: 'hora',
      mapsTo: 'created_at',
      transform: {
        lambda: formatDate,
        options: { dateFormat: 'HHmmss', timezone },
      },
    }, {
```

The most complex transformation would be one taking multiple response properties to compute its return value. One example is the `parseAmount` function. It takes the property `amount` as `value` argument but it also depends on the property `transaction_type` to calculate its return value. Dependency properties for any transformation function can be passed as a list in the `helpers` property.

```javascript
    }, {
      name: 'valor',
      mapsTo: 'amount',
      helpers: ['transaction_type'],
      transform: {
        lambda: parseAmount,
        options: { multiplier: 100, signChanger: 'CANCELLATION' },
      },
    }, {
```

## Deploying the script to Google Cloud

PENDING
