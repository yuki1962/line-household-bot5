
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const app = express();
app.use(express.json());

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

let expenses = []; // メモリ上で支出を保持

// 支出をファイルに保存
function saveExpenses() {
    fs.writeFileSync("expenses.json", JSON.stringify(expenses));
}

// ファイルから支出を読み込む
function loadExpenses() {
    if (fs.existsSync("expenses.json")) {
        expenses = JSON.parse(fs.readFileSync("expenses.json"));
    }
}

loadExpenses();

app.post("/webhook", async (req, res) => {
    const event = req.body.events[0];
    if (event?.message?.type === "text") {
        const text = event.message.text.trim();
        let replyText = "";

        if (/^\D+\s+\d+$/.test(text)) {
            // 支出登録
            const [category, amount] = text.split(/\s+/);
            expenses.push({
                category,
                amount: parseInt(amount, 10),
                date: new Date().toLocaleDateString()
            });
            saveExpenses();
            replyText = `「${category}」に${amount}円を登録しました。`;
        } else if (text === "今日の合計は？") {
            // 今日の合計
            const today = new Date().toLocaleDateString();
            const total = expenses
                .filter(e => e.date === today)
                .reduce((sum, e) => sum + e.amount, 0);
            replyText = `今日の合計は ${total}円です。`;
        } else if (text === "今日の支出は？") {
            // 今日の支出リスト
            const today = new Date().toLocaleDateString();
            const todayExpenses = expenses.filter(e => e.date === today);
            if (todayExpenses.length === 0) {
                replyText = "今日はまだ支出がありません。";
            } else {
                replyText = todayExpenses
                    .map(e => `${e.category}: ${e.amount}円`)
                    .join("\n");
            }
        } else {
            replyText = "支出を登録するには「カテゴリー 金額」と入力してください。\n例: 食費 1200\nまたは「今日の合計は？」と送信してください。";
        }

        // LINEに返信
        await axios.post(
            "https://api.line.me/v2/bot/message/reply",
            {
                replyToken: event.replyToken,
                messages: [{ type: "text", text: replyText }]
            },
            {
                headers: {
                    Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    }
    res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
