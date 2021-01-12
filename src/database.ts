import pgPromise = require("pg-promise")

const credentials = {
    host: '20.50.124.143',
    port: 5432,
    database: 'iroads-network-db',
    user: 'postgres',
    password: '1Road5DB',
    max: 30 // use up to 30 connections
}

const pgp = pgPromise({/* Initialization Options */ })
const connection = pgp(credentials)

export default connection