const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// 🔐 Bot token va adminlar ID ro‘yxati
const TOKEN = '7874883695:AAGveun7nuBmmA7t_TI-N7aBMBIvhMWQMNE'; // <-- o'zingizning tokeningiz
const ADMINS = [8196520468, 951519744]; // <-- o'zingiz va boshqa admin ID larini kiriting

// 📁 Mahalliy JSON fayl orqali ma'lumotlar saqlash
const dbPath = './data.json';
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ groups: [] }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// 📌 Admin tekshiruvchi funksiyasi
function isAdmin(userId) {
  return ADMINS.includes(userId);
}

// 🚀 Botni ishga tushurish
const bot = new TelegramBot(TOKEN, { polling: true });

// ✅ Guruhga bot qo‘shilganda adminlarga xabar yuborish
bot.on('new_chat_members', (msg) => {
  const chat = msg.chat;
  const user = msg.from;
  const data = readData();

  const groupInfo = {
    name: chat.title,
    id: chat.id,
    addedBy: user.first_name,
    date: new Date().toLocaleString()
  };

  const exists = data.groups.find(g => g.id === chat.id);
  if (!exists) {
    data.groups.push(groupInfo);
    writeData(data);

    ADMINS.forEach(adminId => {
      bot.sendMessage(adminId,
        `✅ Yangi guruhga qo‘shildi:\n` +
        `📛 Guruh nomi: ${chat.title}\n` +
        `🆔 Guruh ID: ${chat.id}\n` +
        `👤 Qo‘shgan: ${user.first_name}\n` +
        `📅 Sana: ${groupInfo.date}`
      );
    });
  }
});

// 🧩 /start komandasi – tugmalar bilan boshqaruv
bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg.from.id)) return;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Guruhlar ro'yxati", callback_data: "guruhlar" }],
        [{ text: "📨 Xabar yuborish", callback_data: "xabar" }]
      ]
    }
  };

  bot.sendMessage(msg.chat.id, "👋 Xush kelibsiz! Tugmalardan birini tanlang:", opts);
});

// 🖱 Callback tugmalar ishlov berish
bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;

  if (!isAdmin(userId)) return;

  if (data === 'guruhlar') {
    const groups = readData().groups;
    if (groups.length === 0) {
      bot.sendMessage(chatId, "📭 Hozircha hech qanday guruh mavjud emas.");
    } else {
      const list = groups.map(g =>
        `📍 Guruh nomi: ${g.name}\n🆔 ID: ${g.id}\n📅 Sana: ${g.date}`
      ).join('\n\n');

      bot.sendMessage(chatId, `📋 Guruhlar ro‘yxati:\n\n${list}`);
    }
  }

  if (data === 'xabar') {
    bot.sendMessage(chatId, "📤 Yubormoqchi bo‘lgan xabaringizni kiriting:");

    // Faqat admin yozgan xabarni olaylik
    bot.once('message', (msg) => {
      if (!isAdmin(msg.from.id)) return;

      const groups = readData().groups;
      const message = msg.text;

      let count = 0;

      groups.forEach(g => {
        bot.sendMessage(g.id, message)
          .then(() => count++)
          .catch(err => console.log(`❌ Xatolik: ${err.message}`));
      });

      bot.sendMessage(chatId,
        `✅ Xabar yuborildi!\n📨 Matn: ${message}\n📡 Guruhlarga yuborildi: ${groups.length} ta`);
    });
  }

  bot.answerCallbackQuery(callbackQuery.id);
});
