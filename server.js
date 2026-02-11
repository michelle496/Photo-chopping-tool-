const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(cors());
app.use(express.text());

let db;

// --- 1. 初始化数据库 ---
(async () => {
    db = await open({
        filename: './data_tracking.db', // 数据库文件名，会自动创建
        driver: sqlite3.Database
    });

    // 创建一张表，用来记录每一次点击的具体信息
    await db.exec(`
        CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("--- 数据库已就绪 (SQLite) ---");
})();

// --- 2. 接收埋点并存入数据库 ---
app.post('/api/track', async (req, res) => {
    try {
        const data = JSON.parse(req.body);
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 向数据库插入一行记录
        await db.run(
            'INSERT INTO clicks (event_name, ip_address) VALUES (?, ?)',
            [data.event, ip]
        );

        console.log(`[写入库] 事件: ${data.event} | 来自: ${ip}`);
        res.sendStatus(200);
    } catch (e) {
        res.sendStatus(400);
    }
});

// --- 3. 查看看板 (从数据库实时计算) ---
app.get('/stats', async (req, res) => {
    // 使用 SQL 语句统计数量
    const uploadRes = await db.get('SELECT COUNT(*) as count FROM clicks WHERE event_name = "button_upload_click"');
    const downloadRes = await db.get('SELECT COUNT(*) as count FROM clicks WHERE event_name = "button_download_click"');

    res.send(`
        <div style="text-align:center; font-family:sans-serif; padding:50px;">
            <h1>🗄️ 数据库实时统计</h1>
            <p style="font-size:20px;">上传总计: <strong>${uploadRes.count}</strong></p>
            <p style="font-size:20px;">下载总计: <strong>${downloadRes.count}</strong></p>
            <hr>
            <p>数据永久存储在 data_tracking.db 文件中</p>
        </div>
    `);
});

app.listen(3000, () => console.log('服务运行中: http://localhost:3000'));