import { Client } from 'pg';
const client = new Client({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
});
client.connect((err: any) => {
  if (err) {
    console.error('Connection error', err.stack);
  } else {
    console.log('Connected successfully');
    client.end();
  }
});
