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
        loadDrivers();
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

async function loadOrders() {
    console.log("🚀 開始載入訂單清單...");
    const orderListDiv = document.getElementById('order-list');
    if (!orderListDiv) return;

    // 1. 從 Supabase 抓取資料 (按日期排序)
    const { data: orders, error } = await supabaseClient
        .from('orders')
        .select('*')
        .order('service_date', { ascending: true });

    if (error) {
        console.error("❌ 載入訂單失敗:", error.message);
        orderListDiv.innerHTML = `<p class="text-red-500">載入失敗: ${error.message}</p>`;
        return;
    }

    console.log("✅ 成功抓取訂單數:", orders.length);

    // 2. 清空舊內容並渲染新內容
    if (!orders || orders.length === 0) {
        orderListDiv.innerHTML = '<p class="text-gray-500 text-center py-8">目前尚無訂單</p>';
        return;
    }

    orderListDiv.innerHTML = orders.map(order => `
        <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col gap-2">
            <div class="flex justify-between items-start">
                <div>
                    <span class="font-bold text-lg text-blue-900">${order.service_type || '未分類'}</span>
                    <span class="ml-2 text-gray-500 text-sm">${order.service_date} ${order.pickup_time || ''}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold text-green-600">NT$ ${order.fare || 0}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-x-4 text-sm text-gray-600">
                <p>👤 乘客: ${order.passenger_name || '未提供'}</p>
                <p>📞 電話: ${order.phone || '未提供'}</p>
                <p>📍 從: ${order.pickup_location || '未提供'}</p>
                <p>🏁 到: ${order.dropoff_location || '未提供'}</p>
            </div>
            ${order.remarks ? `<div class="mt-2 text-xs bg-gray-50 p-2 rounded text-gray-500">備註: ${order.remarks}</div>` : ''}
        </div>
    `).join('');
}

    // 確保使用 supabaseClient
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'driver');

    if (error) {
        console.error("❌ 抓取失敗:", error.message);
        return;
    }

    console.log("✅ [數據] 司機清單回傳:", data);

    const select = document.getElementById('driver_select');
    if (!select) return console.error("找不到 driver_select 元素");

    if (data && data.length > 0) {
        select.innerHTML = '<option value="">請選擇司機</option>';
        data.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id;
            option.textContent = d.full_name;
            select.appendChild(option);
        });
        console.log("✨ 下拉選單渲染完成！");
    } else {
        select.innerHTML = '<option value="">目前無可用司機</option>';
    }
}

// async function fetchDrivers() {
//     const { data, error } = await supabaseClient.from('profiles')
//         .select('id, full_name') // 確保欄位名稱跟資料庫一致
//         .eq('role', 'driver');

//     // 極致 J 型人的除錯標籤
//     console.log("嘗試抓取司機名單...");
//     console.log("回傳資料數量:", data ? data.length : 0);
//     if (error) console.error("抓取失敗原因:", error.message);

//     if (data && data.length > 0) {
//         const select = document.getElementById('driver_select'); // 確認 ID 對不對
//         select.innerHTML = '<option value="">請選擇司機</option>';
//         data.forEach(d => {
//             select.innerHTML += `<option value="${d.id}">${d.full_name}</option>`;
//         });
//     }
// }

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
async function submitOrder() {
    /* 使用 supabaseClient.from('orders').insert */
    console.log("🚀 開始儲存訂單...");

    // 1. 收集表單資料 (對齊 index.html 的 ID)
    const orderData = {
        service_type: document.getElementById('service_type').value,
        service_date: document.getElementById('service_date').value,
        pickup_time: document.getElementById('pickup_time').value,
        passenger_name: document.getElementById('passenger_name').value,
        phone: document.getElementById('phone').value,
        flight_num: document.getElementById('flight_num').value,
        pickup_location: document.getElementById('pickup_location').value,
        dropoff_location: document.getElementById('dropoff_location').value,
        adults: parseInt(document.getElementById('adults').value) || 0,
        children: parseInt(document.getElementById('children').value) || 0,
        luggage: document.getElementById('luggage').value,
        remarks: document.getElementById('remarks').value,
        fare: parseFloat(document.getElementById('fare').value) || 0,
        driver_id: document.getElementById('driver_select').value || null // 抓取選中的司機 ID
    };

    console.log("📦 準備送出的資料:", orderData);

    // 2. 寫入 Supabase
    const { data, error } = await supabaseClient
        .from('orders') // 確認你的資料表名稱是 orders
        .insert([orderData])
        .select();

    if (error) {
        console.error("❌ 儲存失敗:", error.message);
        alert("儲存失敗：" + error.message);
        return;
    }

    console.log("✨ 儲存成功:", data);
    alert("訂單已成功儲存！");

    // 3. 儲存成功後重新載入列表
    if (typeof loadOrders === 'function') loadOrders();

    // 4. 清空表單
    document.getElementById('order-form').reset();
}
async function loadOrders() { /* 根據 RLS 權限讀取 orders */ }
