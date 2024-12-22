import express from 'express';
import path from 'path';

import { CodeReviewService } from '../services/code-review';

const router = express.Router();

router.post('/api/code-review', async (req, res) => {
  try {
    const rootDir = path.join(process.cwd());
    const codeReviewService = new CodeReviewService(rootDir);
    const results = await codeReviewService.reviewCode();

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
