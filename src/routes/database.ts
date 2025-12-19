import { Router, Request, Response } from 'express';
import pool from '../config/database';
import logger from '../utils/logger';

const router = Router();

// 1. Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. List all tables with pagination
router.get('/tables', async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  try {
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated tables
    const query = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT $1 OFFSET $2;
    `;
    
    const result = await pool.query(query, [limitNum, offset]);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error: any) {
    logger.error('Failed to fetch tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      message: error.message,
    });
  }
});

// 3. Get table details (total data + field info)
router.get('/table/:tableName/info', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  
  // Basic SQL injection prevention
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }
  
  try {
    // Get total rows count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    const countResult = await pool.query(countQuery);
    const totalRows = parseInt(countResult.rows[0].total);

    // Get table columns/fields
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const schemaResult = await pool.query(schemaQuery, [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      totalRows,
      fields: schemaResult.rows,
      fieldCount: schemaResult.rowCount,
    });
  } catch (error: any) {
    logger.error(`Failed to fetch table info for ${tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table information',
      message: error.message,
    });
  }
});

// 4. Select all data from table with pagination
router.get('/table/:tableName/data', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const { page = 1, limit = 100 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;
  
  // Basic SQL injection prevention
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }
  
  try {
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const query = `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, [limitNum, offset]);
    
    res.json({
      success: true,
      table: tableName,
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to fetch data from ${tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message,
    });
  }
});

// 5. Get detail/single row by ID or custom filter
router.get('/table/:tableName/row', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const { id, field = 'id' } = req.query;
  
  // Basic SQL injection prevention
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(field as string)) {
    res.status(400).json({
      success: false,
      error: 'Invalid field name',
    });
    return;
  }

  if (!id) {
    res.status(400).json({
      success: false,
      error: 'ID parameter is required',
    });
    return;
  }
  
  try {
    const query = `SELECT * FROM ${tableName} WHERE ${field} = $1 LIMIT 1`;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Data not found',
      });
      return;
    }

    res.json({
      success: true,
      table: tableName,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error(`Failed to fetch row from ${tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data',
      message: error.message,
    });
  }
});

export default router;
