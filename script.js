// script.js
// 1. Supabase 設定
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 登入監聽與權限切換
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log("當前狀態:", event, session); // 偵錯
    if (session) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        checkUserRole(session.user.id);
        loadOrders();
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

// 3. AI 辨識功能
async function runAI() {
    const rawText = document.getElementById('ai-input').value;
    if (!rawText) return alert("請先貼上內容");

    const btn = document.getElementById('btn-ai');
    btn.innerText = "辨識中...";
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.functions.invoke('identify-order', {
            body: { orderText: rawText }
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
