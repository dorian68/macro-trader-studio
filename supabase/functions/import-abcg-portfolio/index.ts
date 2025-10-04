import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// French month mapping
const FRENCH_MONTHS: Record<string, number> = {
  'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
  'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
};

function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const parts = dateStr.toLowerCase().trim().split(' ');
  if (parts.length < 4) return null;
  
  const day = parseInt(parts[1]);
  const monthName = parts[2];
  const year = parseInt(parts[3]);
  
  const month = FRENCH_MONTHS[monthName];
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  
  return new Date(year, month, day);
}

function normalizeNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/'/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parsePercentage(value: string): number | null {
  if (!value || value.trim() === '' || value === '#VALEUR!') return null;
  
  const cleaned = value.replace('%', '').trim();
  const num = normalizeNumber(cleaned);
  
  return num !== null ? num / 100 : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvContent, userId } = await req.json();

    if (!csvContent || !userId) {
      throw new Error('CSV content and userId are required');
    }

    console.log('[ABCG Import] Starting import for user:', userId);

    // Parse CSV
    const lines = csvContent.split('\n').filter((line: string) => line.trim());
    const headers = lines[0].split(';');
    
    const positions = [];
    let skippedRows = 0;

    for (let i = 1; i < lines.length - 1; i++) { // Skip header and total row
      const values = lines[i].split(';');
      const row: Record<string, string> = {};
      
      headers.forEach((header: string, index: number) => {
        row[header.trim()] = values[index]?.trim() || '';
      });

      // Skip invalid rows
      if (!row.Instrument || !row['Entry Price'] || row.Status === 'Invalid') {
        skippedRows++;
        continue;
      }

      const sentDate = parseFrenchDate(row['Sent Date']);
      const entryPrice = normalizeNumber(row['Entry Price']);
      const percentChange = parsePercentage(row['% change']);

      if (!entryPrice) {
        skippedRows++;
        continue;
      }

      const currentPrice = percentChange !== null 
        ? entryPrice * (1 + percentChange)
        : entryPrice;

      const marketValue = percentChange !== null
        ? entryPrice * percentChange
        : 0;

      positions.push({
        symbol: row.Instrument,
        quantity: 1,
        average_price: entryPrice,
        current_price: currentPrice,
        market_value: marketValue,
        created_at: sentDate?.toISOString() || new Date().toISOString(),
      });
    }

    console.log(`[ABCG Import] Parsed ${positions.length} valid positions, skipped ${skippedRows} rows`);

    // Create or get ABCG Research portfolio
    const { data: existingPortfolio, error: fetchError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId)
      .eq('name', 'ABCG Research')
      .maybeSingle();

    let portfolioId: string;

    if (existingPortfolio) {
      portfolioId = existingPortfolio.id;
      console.log('[ABCG Import] Found existing portfolio:', portfolioId);
      
      // Delete existing positions
      const { error: deleteError } = await supabase
        .from('positions')
        .delete()
        .eq('portfolio_id', portfolioId);
      
      if (deleteError) throw deleteError;
    } else {
      const totalValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      
      const { data: newPortfolio, error: createError } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          name: 'ABCG Research',
          description: 'Historical portfolio performance from ABCG Research investment ideas',
          total_value: totalValue,
        })
        .select()
        .single();

      if (createError) throw createError;
      portfolioId = newPortfolio.id;
      console.log('[ABCG Import] Created new portfolio:', portfolioId);
    }

    // Insert positions in batches
    const batchSize = 50;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize).map(p => ({
        ...p,
        portfolio_id: portfolioId,
      }));

      const { error: insertError } = await supabase
        .from('positions')
        .insert(batch);

      if (insertError) throw insertError;
    }

    // Update portfolio total value
    const totalValue = positions.reduce((sum, p) => sum + p.market_value, 0);
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({ total_value: totalValue })
      .eq('id', portfolioId);

    if (updateError) throw updateError;

    console.log('[ABCG Import] Successfully imported portfolio');

    return new Response(
      JSON.stringify({
        success: true,
        portfolioId,
        positionsImported: positions.length,
        rowsSkipped: skippedRows,
        totalValue,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ABCG Import] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
