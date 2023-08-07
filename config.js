require("dotenv").config();
const mysql = require("mysql");

const urlDB = `mysql://${process.env.REACT_APP_MYSQL_USER}:${process.env.REACT_APP_MYSQL_PASSWORD}@${process.env.REACT_APP_MYSQL_HOST}:${process.env.REACT_APP_MYSQL_PORT}/${process.env.REACT_APP_MYSQL_DATABASE}`;

const connection = mysql.createConnection(urlDB);

module.exports = connection;
