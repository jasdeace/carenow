// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert the messy XML document from the API into clean HTML
function parseDocXmlToHtml(xml: string | null): string {
  if (!xml) return '';
  
  let html = xml;
  // Remove CDATA markers
  html = html.replace(/<!\[CDATA\[/g, '');
  html = html.replace(/\]\]>/g, '');
  
  // Convert ARTICLE tags to bold headers
  html = html.replace(/<ARTICLE\s+title="([^"]*)">/g, '<h5 style="font-weight:bold; margin-top:12px; margin-bottom:4px;">$1</h5>');
  html = html.replace(/<\/ARTICLE>/g, '');
  
  // Convert PARAGRAPH tags to paragraphs
  html = html.replace(/<PARAGRAPH[^>]*>/g, '<p style="margin-bottom:4px; font-size:14px;">');
  html = html.replace(/<\/PARAGRAPH>/g, '</p>');
  
  // Remove other structural XML tags
  html = html.replace(/<DOC[^>]*>/g, '');
  html = html.replace(/<\/DOC>/g, '');
  html = html.replace(/<SECTION[^>]*>/g, '');
  html = html.replace(/<\/SECTION>/g, '');
  
  return html.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { itemName } = await req.json()
    
    if (!itemName || itemName.trim().length === 0) {
      throw new Error("itemName is required")
    }

    const DRUG_API_KEY = Deno.env.get('DRUG_API_KEY')
    if (!DRUG_API_KEY) {
      throw new Error("DRUG_API_KEY is not set in Edge Function secrets")
    }

    const encodedName = encodeURIComponent(itemName.trim())
    
    // Switch to DrugPrdtPrmsnInfoService07 (Prescription & Permitted Drugs)
    const url = `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq06?serviceKey=${DRUG_API_KEY}&type=json&numOfRows=10&item_name=${encodedName}`

    console.log("Fetching drug info (PrmsnDtlInq06) for:", itemName)

    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      console.error("Drug API Error:", data)
      throw new Error("Failed to fetch drug info from Korean Drug API")
    }

    const items = data?.body?.items || []

    // Map the new fields to our existing frontend structure
    const drugs = items.map((item: any) => ({
      itemName: item.ITEM_NAME || '',
      entpName: item.ENTP_NAME || '',
      itemSeq: item.ITEM_SEQ || '',
      
      // Parse the XML document fields into clean HTML
      efcyQesitm: parseDocXmlToHtml(item.EE_DOC_DATA),          // 효능효과
      useMethodQesitm: parseDocXmlToHtml(item.UD_DOC_DATA),     // 용법용량
      atpnQesitm: parseDocXmlToHtml(item.NB_DOC_DATA),          // 주의사항
      
      // The new API doesn't provide simple fields for these, so we leave them empty or map if available
      intrcQesitm: '', 
      seQesitm: '',
      depositMethodQesitm: item.STORAGE_METHOD || '',           // 보관법 (if available)
      
      // DrugPrdtPrmsnInfoService07 doesn't return an image URL natively in the detail endpoint
      itemImage: '',
    }))

    return new Response(JSON.stringify({ drugs, totalCount: data?.body?.totalCount || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const err = error as Error
    console.error("Edge Function Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
