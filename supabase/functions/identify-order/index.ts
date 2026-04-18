// index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderText } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEYS')

    // 修正點：使用 v1 穩定版路徑
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const prompt = `你是一個機場接送訂單辨識助手。請將以下文字辨識為 JSON 格式，包含欄位：
    service_type (接機/送機), service_date (YYYY-MM-DD), pickup_time (HH:mm), 
    passenger_name, phone, flight_num, pickup_location, dropoff_location, 
    adults, children, luggage, remarks, fare (數字)。文字內容如下：\n${orderText}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const result = await response.json()
    console.log("Gemini Response:", JSON.stringify(result))

    if (result.error) throw new Error(result.error.message)

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text
    const cleanJson = aiText?.match(/\{[\s\S]*\}/)?.[0]

    if (!cleanJson) throw new Error("無法解析 AI 回傳的 JSON 格式")

    return new Response(cleanJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
