// index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 處理瀏覽器的預檢請求 (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {

        const { orderText } = await req.json()
        // 1. 取得整串金鑰字串
        const keysRaw = Deno.env.get('GEMINI_API_KEYS') || "";

        // 2. 用逗號拆解成陣列 [ "A123", "B456", "C789" ]
        const keyList = keysRaw.split(',').map(k => k.trim()).filter(k => k.length > 0);

        // 3. 從陣列中隨機抽出一個索引 (Index)
        const apiKey = keyList[Math.floor(Math.random() * keyList.length)];

        console.log("後端偵測到的金鑰總數:", keyList.length);
        console.log("本次使用的金鑰開頭:", apiKey?.substring(0, 4));
        console.log("本次使用的金鑰長度:", apiKey?.length);


        const prompt = `你是一個機場接送訂單辨識助手。請將以下文字辨識為 JSON 格式，包含欄位：
    service_type (接機/送機), service_date (YYYY-MM-DD), pickup_time (HH:mm), 
    passenger_name, phone, flight_num, pickup_location, dropoff_location, 
    adults, children, luggage, remarks, fare (數字)。文字內容如下：\n${orderText}`

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        })

        const result = await response.json()
        console.log("Gemini 原文回應:", JSON.stringify(result));
        if (result.error) {
            return new Response(JSON.stringify({ error: `Gemini API 錯誤: ${result.error.message}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // 這裡只是簡單範例，實務上需解析 Gemini 回傳的文字，並確保它是有效的 JSON 格式
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) {
            return new Response(JSON.stringify({ error: "Gemini 沒有回傳有效內容，請檢查 Logs" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }
        const cleanJson = aiText.match(/\{[\s\S]*\}/)?.[0];

        return new Response(cleanJson, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
