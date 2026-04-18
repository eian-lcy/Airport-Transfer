// index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 跨年年份校準函數
function getCorrectYear(targetMonth: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // 邏輯：如果目標月份比現在小，且現在已進入下半年（10-12月），則視為明年訂單
  if (targetMonth < currentMonth && currentMonth >= 10) {
    return currentYear + 1;
  }
  return currentYear;
}

serve(async (req) => {
  // 1. 先處理 CORS 預檢，避免 502/CORS 錯誤
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { orderText } = await req.json()
    
    // 2. 金鑰輪詢邏輯
    const keysRaw = Deno.env.get('GEMINI_API_KEYS') || "";
    const keyList = keysRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const apiKey = keyList[Math.floor(Math.random() * keyList.length)];

    // 3. 模型網址修正 (使用 v1beta 以獲得最佳相容性)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`

    const prompt = `你是一個機場接送訂單辨識助手。請將以下文字辨識為 JSON 格式，包含：
    service_type (接機/送機), service_date (YYYY-MM-DD), pickup_time (HH:mm), 
    passenger_name, phone, flight_num, pickup_location, dropoff_location, 
    adults, children, luggage, remarks, fare (數字)。
    【注意】：如果輸入文字沒年份，請先回傳 MM-DD 格式即可。文字內容如下：\n${orderText}`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })

    const result = await response.json()
    if (result.error) throw new Error(result.error.message)

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text
    const cleanJson = aiText?.match(/\{[\s\S]*\}/)?.[0]
    if (!cleanJson) throw new Error("無法解析 AI 回傳的內容")

    // 4. 解析與年份校正 (確保 parsedData 定義在 try 塊內並在此處回傳)
    let parsedData = JSON.parse(cleanJson)

    if (parsedData.service_date && typeof parsedData.service_date === 'string') {
      const parts = parsedData.service_date.split('-')
      if (parts.length >= 2) {
        const m = parseInt(parts[parts.length - 2])
        const d = parseInt(parts[parts.length - 1])
        const y = getCorrectYear(m)
        parsedData.service_date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }

    // 5. 成功回傳 (必須在 try 區塊內，這樣才能抓到 parsedData)
    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("錯誤發生:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
