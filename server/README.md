# Audit Dashboard Server

This is the back-end server for the Audit Dashboard application. It provides API endpoints for storing and retrieving reports.

## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file and configure it with your settings.

## Configuration

The server supports two storage backends:

### File System Storage (Default)
- Stores reports as JSON files in the `data` directory
- No additional configuration needed

### S3 Storage
- Stores reports in an AWS S3 bucket
- Requires AWS credentials and bucket configuration

Configure the storage type in your `.env` file:

```
STORAGE_TYPE=file # or 's3'

# For S3 storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
S3_BUCKET_NAME=your-bucket-name
```

## Running the Server

Start the server in development mode:
```bash
npm run dev
```

Start the server in production mode:
```bash
npm start
```

## API Endpoints

- `GET /api/reports/:id` - Retrieve a report by ID
- `POST /api/reports` - Create a new report
- `PUT /api/reports/:id` - Update an existing report
- `DELETE /api/reports/:id` - Delete a report

## Integration with Front-end

The front-end application can load a specific report by adding the report ID as a query parameter:

```
http://localhost:5173/?id=report-123
```