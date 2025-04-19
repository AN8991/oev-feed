const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/postgres',
});
client.connect(err => {
  if (err) {
    console.error('Connection error', err.stack);
  } else {
    console.log('Connected successfully');
    client.end();
  }
});
