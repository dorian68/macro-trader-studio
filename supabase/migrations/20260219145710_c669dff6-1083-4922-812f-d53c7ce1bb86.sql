ALTER TABLE chart_provider_settings
ADD COLUMN IF NOT EXISTS display_options jsonb DEFAULT '{
  "showGrid": false,
  "showPriceScale": true,
  "showTimeScale": true,
  "showVolume": false,
  "showStudies": false,
  "showToolbar": false
}'::jsonb;