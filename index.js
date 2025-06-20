const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// 🛡 Token va Admin ID
const TOKEN = '7874883695:AAGveun7nuBmmA7t_TI-N7aBMBIvhMWQMNE'; // <-- o'zingizning bot tokeningiz
const ADMIN_ID = 8196520468; // <-- o'zingizning Telegram ID

// 📁 JSON bazasini yaratish
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

// 🚀 Botni ishga tushurish
const bot = new TelegramBot(TOKEN, { polling: true });


// ✅ Guruhga qo‘shilganda
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

  const alreadyExists = data.groups.find(g => g.id === chat.id);
  if (!alreadyExists) {
    data.groups.push(groupInfo);
    writeData(data);

    bot.sendMessage(ADMIN_ID,
      `✅ Yangi guruhga qo‘shildi:\n` +
      `📛 Guruh nomi: ${chat.title}\n` +
      `🆔 Guruh ID: ${chat.id}\n` +
      `👤 Qo‘shgan: ${user.first_name}\n` +
      `📅 Sana: ${groupInfo.date}`
    );
  }
});


// 🎛 /start komandasi – tugmalar yuboradi
bot.onText(/\/start/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📋 Guruhlar ro'yxati", callback_data: "guruhlar" }],
        [{ text: "📨 Xabar yuborish", callback_data: "xabar" }]
      ]
    }
  };

  bot.sendMessage(ADMIN_ID, "👋 Xush kelibsiz! Quyidagilardan birini tanlang:", opts);
});


// 🖱 Tugma bosilganda javob berish
bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  if (callbackQuery.from.id !== ADMIN_ID) return;

  if (data === 'guruhlar') {
    const groups = readData().groups;

    if (groups.length === 0) {
      bot.sendMessage(chatId, "📭 Hech qanday guruh topilmadi.");
    } else {
      const list = groups.map(g =>
        `📍 Guruh nomi: ${g.name}\n🆔 ID: ${g.id}\n📅 Sana: ${g.date}`
      ).join('\n\n');

      bot.sendMessage(chatId, `📋 Guruhlar ro‘yxati:\n\n${list}`);
    }
  }

  if (data === 'xabar') {
    bot.sendMessage(chatId, "📤 Yubormoqchi bo‘lgan xabaringizni kiriting:");

    bot.once('message', (msg) => {
      if (msg.from.id !== ADMIN_ID) return;

      const groups = readData().groups;
      const message = msg.text;
      let sentCount = 0;

      groups.forEach(g => {
        bot.sendMessage(g.id, message)
          .then(() => sentCount++)
          .catch(err => console.log(`❌ Xatolik: ${err.message}`));
      });

      bot.sendMessage(chatId,
        `✅ Xabar yuborildi!\n` +
        `📨 Xabar matni: ${message}\n` +
        `📡 Yuborilgan guruhlar soni: ${groups.length} ta`
      );
    });
  }

  // Tugma javobini yashirish
  bot.answerCallbackQuery(callbackQuery.id);
});
