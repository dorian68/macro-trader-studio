-- Add UNIQUE constraint on job_id to fix ON CONFLICT error in sync_trade_setup_from_job() trigger
ALTER TABLE ai_trade_setups
ADD CONSTRAINT ai_trade_setups_job_id_unique UNIQUE (job_id);

-- Add explanatory comment
COMMENT ON CONSTRAINT ai_trade_setups_job_id_unique ON ai_trade_setups IS 
'Ensures one AI Trade Setup per job. Required for ON CONFLICT in sync_trade_setup_from_job() trigger.';