const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Function to read private key and create a signed JWT
async function getSignedJWT() {
  const file = fs.readFileSync('keys/keys.json', 'utf8')
  console.log({
    file
  })
  const privateKey = JSON.parse(fs.readFileSync('keys/keys.json', 'utf8')).private_key;
  const token = jwt.sign({}, privateKey, { 
    algorithm: 'RS256',
    expiresIn: '1h',
    audience: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    issuer: '23b07e2e-e31d-4274-be67-13b38a09065c'
  });
  return token;
}


// Function to get access token
async function getAccessToken(signedJWT) {
  try {
    const response = await axios.post('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: signedJWT
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Function to make Bulk API request
async function makeBulkAPIRequest(accessToken) {
  try {
    const response = await axios.get('https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/$export', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });
    return response.data.output[0].url;
  } catch (error) {
    console.error('Error making Bulk API request:', error);
    throw error;
  }
}

// Function to wait for Bulk API response
async function waitForBulkAPIResponse(statusUrl, accessToken) {
  while (true) {
    try {
      const response = await axios.get(statusUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      if (error.response && error.response.status === 202) {
        // Still processing, wait and try again
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('Error checking Bulk API status:', error);
        throw error;
      }
    }
  }
}

// Function to parse Bulk API response and check for abnormal lab readings
function checkAbnormalLabReadings(data) {
  const abnormalReadings = [];
  data.entry.forEach(entry => {
    if (entry.resource.resourceType === 'Observation' && entry.resource.interpretation) {
      const interpretation = entry.resource.interpretation[0].coding[0].code;
      if (interpretation === 'A' || interpretation === 'AA' || interpretation === 'HH' || interpretation === 'LL') {
        abnormalReadings.push(entry.resource);
      }
    }
  });
  return abnormalReadings;
}

// Function to send email
async function sendEmail(abnormalReadings) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your_email@example.com',
      pass: 'your_password'
    }
  });

  const mailOptions = {
    from: 'your_email@example.com',
    to: 'recipient@example.com',
    subject: 'Abnormal Lab Readings Alert',
    text: `The following abnormal lab readings were detected:\n\n${JSON.stringify(abnormalReadings, null, 2)}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Main function to run the entire process
async function monitorAbnormalLabReadings() {
  try {
    const signedJWT = await getSignedJWT();
    const accessToken = await getAccessToken(signedJWT);
    const bulkRequestUrl = await makeBulkAPIRequest(accessToken);
    const bulkData = await waitForBulkAPIResponse(bulkRequestUrl, accessToken);
    const abnormalReadings = checkAbnormalLabReadings(bulkData);
    
    if (abnormalReadings.length > 0) {
      await sendEmail(abnormalReadings);
    } else {
      console.log('No abnormal lab readings found');
    }
  } catch (error) {
    console.error('Error in monitorAbnormalLabReadings:', error);
  }
}

// Run the function every 24 hours
// setInterval(monitorAbnormalLabReadings, 24 * 60 * 60 * 1000);

// Initial run
monitorAbnormalLabReadings();