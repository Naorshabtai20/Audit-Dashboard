require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// AWS S3 setup if configured
let s3;
let S3_BUCKET_NAME;
if (process.env.STORAGE_TYPE === 's3')
{
    const AWS = require('aws-sdk');
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });
    s3 = new AWS.S3();
    S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
}

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'file';

const ID_REGEX = /^[A-Za-z0-9_-]+$/;
const MAX_ID_LENGTH = 64;
const validateId = (req, res, next) =>
{
    const id = req.params?.id;
    if (!id || !ID_REGEX.test(id) || id.length > MAX_ID_LENGTH)
    {
        return res.status(400).json({ error: `Invalid id: only digits, latin letters, dashes and underscores allowed, max length ${MAX_ID_LENGTH}` });
    }
    next();
};

// Ensure data directory exists for file storage
if (STORAGE_TYPE === 'file' && !fs.existsSync(DATA_DIR))
{
    fs.mkdirSync(DATA_DIR);
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Helper function to get file path
const getFilePath = (id) => path.join(DATA_DIR, `${id}.json`);

// Helper function to save data based on storage type
const saveData = async (id, data) =>
{
    if (STORAGE_TYPE === 's3')
    {
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: `${id}.json`,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        };
        await s3.putObject(params).promise();
    } else
    {
        fs.writeFileSync(getFilePath(id), JSON.stringify(data, null, 2));
    }
};

// Helper function to get data based on storage type
const getData = async (id) =>
{
    if (STORAGE_TYPE === 's3')
    {
        try
        {
            const params = {
                Bucket: S3_BUCKET_NAME,
                Key: `${id}.json`
            };
            const data = await s3.getObject(params).promise();
            return JSON.parse(data.Body.toString('utf-8'));
        } catch (err)
        {
            if (err.code === 'NoSuchKey')
            {
                return null;
            }
            throw err;
        }
    } else
    {
        const filePath = getFilePath(id);
        if (!fs.existsSync(filePath))
        {
            return null;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
};

// Helper function to check if data exists
const dataExists = async (id) =>
{
    if (STORAGE_TYPE === 's3')
    {
        try
        {
            const params = {
                Bucket: S3_BUCKET_NAME,
                Key: `${id}.json`
            };
            await s3.headObject(params).promise();
            return true;
        } catch (err)
        {
            if (err.code === 'NotFound')
            {
                return false;
            }
            throw err;
        }
    } else
    {
        return fs.existsSync(getFilePath(id));
    }
};

// Helper function to delete data
const deleteData = async (id) =>
{
    if (STORAGE_TYPE === 's3')
    {
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: `${id}.json`
        };
        await s3.deleteObject(params).promise();
    } else
    {
        fs.unlinkSync(getFilePath(id));
    }
};

// API Endpoints

// Get a report by ID
app.get('/api/reports/:id', validateId, async (req, res) =>
{
    try
    {
        const data = await getData(req.params.id);

        if (!data)
        {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json(data);
    } catch (err)
    {
        console.error('Error reading report:', err);
        res.status(500).json({ error: 'Error reading report' });
    }
});

// Create a new report
app.post('/api/reports/:id', validateId, async (req, res) =>
{
    try
    {
        const report = req.body;
        const id = req.params.id;

        await saveData(id, report);
        res.json({ id, message: 'Report saved successfully' });
    } catch (err)
    {
        console.error('Error saving report:', err);
        res.status(500).json({ error: 'Error saving report' });
    }
});

// Update an existing report
app.put('/api/reports/:id', validateId, async (req, res) =>
{
    try
    {
        const exists = await dataExists(req.params.id);

        if (!exists)
        {
            return res.status(404).json({ error: 'Report not found' });
        }

        await saveData(req.params.id, req.body);
        res.json({ message: 'Report updated successfully' });
    } catch (err)
    {
        console.error('Error updating report:', err);
        res.status(500).json({ error: 'Error updating report' });
    }
});

// Delete a report
app.delete('/api/reports/:id', validateId, async (req, res) =>
{
    try
    {
        const exists = await dataExists(req.params.id);

        if (!exists)
        {
            return res.status(404).json({ error: 'Report not found' });
        }

        await deleteData(req.params.id);
        res.json({ message: 'Report deleted successfully' });
    } catch (err)
    {
        console.error('Error deleting report:', err);
        res.status(500).json({ error: 'Error deleting report' });
    }
});

// Start server
app.listen(PORT, () =>
{
    console.log(`Server running on http://localhost:${PORT}`);
});