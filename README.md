# FHIR Express Backend

This is a production-grade Express.js application with TypeScript for handling FHIR resources, implementing a scheduler for FHIR-related tasks, and monitoring abnormal lab readings.

## Features

- Express.js with TypeScript
- REST API for FHIR resources (currently implemented for Patients)
- Scheduler for periodic FHIR-related tasks
- Abnormal Lab Readings Monitoring Service
- Error handling and logging
- CORS, Helmet for security
- Environment variable configuration
- Swagger UI for API documentation
- JWKS (JSON Web Key Set) endpoint for token verification

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd fhir-express-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add the following:
   ```
   PORT=3000
   FHIR_SERVER_URL=<your-fhir-server-url>
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

4. Generate or provide your own `keys.json` file in the `keys` folder. The file should contain your JSON Web Key Set. For example:
   ```json
   {
     "keys": [
       {
         "kty": "RSA",
         "kid": "1",
         "use": "sig",
         "alg": "RS256",
         "n": "your-modulus-here",
         "e": "AQAB"
       }
     ]
   }
   ```

## Running the application

### Development mode

```
npm run dev
```

This will start the server in development mode with hot reloading.

### Production mode

First, build the application:

```
npm run build
```

Then, start the server:

```
npm start
```

## API Documentation

The API documentation is automatically generated using Swagger. You can access the Swagger UI at:

```
http://localhost:3000/api-docs
```

This provides an interactive interface to explore and test the API endpoints.

## JWKS Endpoint

The JWKS (JSON Web Key Set) endpoint is available at:

```
http://localhost:3000/jwks
```

This endpoint returns the public keys used for verifying JWT tokens.

## API Endpoints

- GET /api/patients - Get all patients
- GET /api/patients/:id - Get a specific patient
- POST /api/patients - Create a new patient
- PUT /api/patients/:id - Update a patient
- DELETE /api/patients/:id - Delete a patient

For detailed information about request/response schemas and example payloads, please refer to the Swagger UI.

## Scheduler

The application includes a scheduler that runs daily at midnight to sync patient data. You can modify the scheduler logic in `src/utils/scheduler.ts`.

## Abnormal Lab Readings Monitoring Service

The application includes a service for monitoring abnormal lab readings. This service is implemented using the following components:

- `src/services/monitoringService.ts`: Main service that orchestrates the monitoring process
- `src/services/authService.ts`: Handles authentication with the FHIR server
- `src/services/apiService.ts`: Manages API communication with the FHIR server
- `src/services/dataProcessingService.ts`: Processes and analyzes patient data and observations
- `src/services/emailService.ts`: Sends email notifications for abnormal lab readings

To customize the monitoring process or adjust the criteria for abnormal readings, you can modify these services as needed.

## Logging

Logs are written to `error.log` and `combined.log` files, as well as to the console.

## Project Structure

The project follows a modular structure adhering to SOLID principles:

```
src/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
│   ├── authService.ts
│   ├── apiService.ts
│   ├── dataProcessingService.ts
│   ├── emailService.ts
│   └── monitoringService.ts
├── utils/
└── server.ts
```

Each service in the `services/` directory has a single responsibility, making the codebase more maintainable and easier to extend.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the ISC License - see the LICENSE.md file for details.