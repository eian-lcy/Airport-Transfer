// script.js
const SUPABASE_URL = "https://krfltdgjrymcyacolvmw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZmx0ZGdqcnltY3lhY29sdm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTM5MTQsImV4cCI6MjA5MjAyOTkxNH0.uCBvWr2Wl600iKsu6cuF5-4t3SSxF1KaNP5NacfzSgw";
// 1. Supabase 設定
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 登入監聽與權限切換
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("當前狀態:", event, session);
    if (session) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        
        // --- 核心修復：登入後立刻跑這三個函數 ---
        checkUserRole(session.user.id);
        loadOrders();
        loadDriverList(); 
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }
});

// 檢查角色 (假設你在 profiles 表有存 role)
async function checkUserRole(userId) {
    const { data } = await supabaseClient.from('profiles').select('role').eq('id', userId).single();
    if (data?.role !== 'admin') {
        document.getElementById('admin-only-section').classList.add('hidden');
        document.getElementById('driver-select-area').classList.add('hidden');
    }
}

async function loadDriverList() {
    console.log("🚀 開始抓取司機清單...");
    
    // 注意：這裡必須用 supabaseClient，並確保欄位叫 full_name
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'driver');

    if (error) return console.error("抓取司機失敗:", error.message);

    console.log("✅ 資料庫回傳結果:", data);

    const select = document.getElementById('driver_select'); // 請確認 HTML 裡的 ID 是這個
    if (!select) return console.error("找不到 driver_select 選單");

    if (select && data) {
        select.innerHTML = '<option value="">請選擇司機</option>';
        data.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.full_name;
            select.appendChild(option);
        });
        console.log("✅ 司機選單更新成功！資料筆數:", data.length);
    }
}

async function fetchDrivers() {
    const { data, error } = await supabaseClient.from('profiles')
        .select('id, full_name') // 確保欄位名稱跟資料庫一致
        .eq('role', 'driver');

    // 極致 J 型人的除錯標籤
    console.log("嘗試抓取司機名單...");
    console.log("回傳資料數量:", data ? data.length : 0);
    if (error) console.error("抓取失敗原因:", error.message);

    if (data && data.length > 0) {
        const select = document.getElementById('driver_select'); // 確認 ID 對不對
        select.innerHTML = '<option value="">請選擇司機</option>';
        data.forEach(d => {
            select.innerHTML += `<option value="${d.id}">${d.full_name}</option>`;
        });
    }
}

// 3. AI 辨識功能
async function runAI() {
    const rawText = document.getElementById('ai-input').value;
    if (!rawText) return alert("請先貼上內容");

    const btn = document.getElementById('btn-ai');
    btn.innerText = "辨識中...";
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.functions.invoke('identify-order', {
            body: { orderText: rawText },
            // 關鍵：強制清空 Header，不讓它自動帶入可能報錯的加密權杖
            headers: {
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });

        if (error) throw error;

        // 將 AI 回傳的資料填入表單
        document.getElementById('service_type').value = data.service_type || "";
        document.getElementById('service_date').value = data.service_date || "";
        document.getElementById('pickup_time').value = data.pickup_time || "";
        document.getElementById('passenger_name').value = data.passenger_name || "";
        document.getElementById('phone').value = data.phone || "";
        document.getElementById('flight_num').value = data.flight_num || "";
        document.getElementById('pickup_location').value = data.pickup_location || "";
        document.getElementById('dropoff_location').value = data.dropoff_location || "";
        document.getElementById('adults').value = data.adults || 0;
        document.getElementById('children').value = data.children || 0;
        document.getElementById('luggage').value = data.luggage || "";
        document.getElementById('remarks').value = data.remarks || "";
        document.getElementById('fare').value = data.fare || 0;

        alert("辨識成功，請檢查並手動修正後儲存！");
    } catch (err) {
        console.error(err);
        alert("AI 辨識出錯，請檢查 Edge Function 設定。");
    } finally {
        btn.innerText = "Gemini 辨識填表";
        btn.disabled = false;
    }
}

// 4. 登入與儲存訂單 (其餘省略...)
async function handleLogin() {
    const userId = document.getElementById('user_id').value.trim();
    const password = document.getElementById('password').value;

    if (!userId || !password) {
        return alert("請輸入代號與密碼");
    }

    // 重點：在此統一加上你的虛擬網域後綴
    const fakeEmail = `${userId}@jcjs.com`;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
    });

    if (error) {
        console.error(error.message);
        alert("登入失敗：代號或密碼錯誤");
    } else {
        console.log("登入成功:", data.user);
        // 登入成功後的邏輯會被 supabaseClient.auth.onAuthStateChange 捕捉
    }
}
async function handleLogout() {
    await supabaseClient.auth.signOut();
}
async function submitOrder() { /* 使用 supabaseClient.from('orders').insert */ }
async function loadOrders() { /* 根據 RLS 權限讀取 orders */ }
