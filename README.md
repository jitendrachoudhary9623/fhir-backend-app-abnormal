# FHIR Express Backend

This is a production-grade Express.js application with TypeScript for handling FHIR resources and implementing a scheduler for FHIR-related tasks.

## Features

- Express.js with TypeScript
- REST API for FHIR resources (currently implemented for Patients)
- Scheduler for periodic FHIR-related tasks
- Error handling and logging
- CORS, Helmet for security
- Environment variable configuration
- Swagger UI for API documentation

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

## API Endpoints

- GET /api/patients - Get all patients
- GET /api/patients/:id - Get a specific patient
- POST /api/patients - Create a new patient
- PUT /api/patients/:id - Update a patient
- DELETE /api/patients/:id - Delete a patient

For detailed information about request/response schemas and example payloads, please refer to the Swagger UI.

## Scheduler

The application includes a scheduler that runs daily at midnight to sync patient data. You can modify the scheduler logic in `src/utils/scheduler.ts`.

## Logging

Logs are written to `error.log` and `combined.log` files, as well as to the console.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the ISC License - see the LICENSE.md file for details.