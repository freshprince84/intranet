const http = require('http');

const data = JSON.stringify({
  username: 'cursor',
  email: 'cursor@example.com',
  password: 'Cursor123!',
  firstName: 'Cursor',
  lastName: 'AI',
  roleId: 999
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end(); 