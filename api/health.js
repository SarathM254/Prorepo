/**
 * Vercel Serverless Function - Health Check
 */

export default function handler(req, res) {
    res.status(200).json({
        status: 'OK',
        message: 'Proto backend is running on Vercel',
        timestamp: new Date().toISOString()
    });
}

