import { Router, Request, Response } from 'express';
import pool from '../config/database';
import logger from '../utils/logger';

const router = Router();

// Health check endpoint
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

// Execute SELECT query
router.post('/query', async (req: Request, res: Response) => {
  const { query, params } = req.body;
  
  if (!query) {
    res.status(400).json({
      success: false,
      error: 'Query is required',
    });
    return;
  }
  
  // Security: Only allow SELECT queries
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery.startsWith('select')) {
    res.status(403).json({
      success: false,
      error: 'Only SELECT queries are allowed',
    });
    return;
  }
  
  try {
    const result = await pool.query(query, params || []);
    
    logger.info(`Query executed successfully. Rows: ${result.rowCount}`);
    
    res.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
      fields: result.fields.map(f => ({ name: f.name, dataType: f.dataTypeID })),
    });
  } catch (error: any) {
    logger.error('Query execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message,
    });
  }
});

// Execute raw query (for trusted clients only - more dangerous)
router.post('/execute', async (req: Request, res: Response) => {
  const { query, params } = req.body;
  
  if (!query) {
    res.status(400).json({
      success: false,
      error: 'Query is required',
    });
    return;
  }
  
  try {
    const result = await pool.query(query, params || []);
    
    logger.info(`Query executed. Command: ${result.command}, Rows affected: ${result.rowCount}`);
    
    res.json({
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
      command: result.command,
    });
  } catch (error: any) {
    logger.error('Query execution failed:', error);
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      message: error.message,
    });
  }
});

// Get table data
router.get('/table/:tableName', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  
  // Basic SQL injection prevention
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }
  
  try {
    const query = `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, [limit, offset]);
    
    res.json({
      success: true,
      table: tableName,
      data: result.rows,
      rowCount: result.rowCount,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    logger.error(`Failed to fetch table ${tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message,
    });
  }
});

// Get database tables list
router.get('/tables', async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      tables: result.rows,
      count: result.rowCount,
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

// Get table schema
router.get('/schema/:tableName', async (req: Request, res: Response) => {
  const { tableName } = req.params;
  
  if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
    res.status(400).json({
      success: false,
      error: 'Invalid table name',
    });
    return;
  }
  
  try {
    const query = `
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
    
    const result = await pool.query(query, [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      columns: result.rows,
    });
  } catch (error: any) {
    logger.error(`Failed to fetch schema for ${tableName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table schema',
      message: error.message,
    });
  }
});

export default router;
