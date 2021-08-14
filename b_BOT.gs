const botToken = '1806755265:AAEfT28OfIPFzvFjjmz77l2Q3BhsZs4hJkM';
const webAppUrl = 'https://script.google.com/macros/s/AKfycbx5HKPT8YzYIN53heCA5NdCBd1ZHeiqezsw_94BR47hXbTYQCayCujBUE3CiG2OVZlzbA/exec';

/* Version 10.06.2021 */
const autoLists = ss.getSheetByName('[svc]AutoLists')                                     // получаем доступ  к сервисному листу
const botDataList = ss.getSheetByName('[svc]BOT').getRange(1, 2, 2);                      //                  к диапазону подписчиков бота
const defaultObj = JSON.stringify({ 'id': '', 'added': [] });
const emodjiDict = { 'Удостоверение': '📃', 'Инструмент': '🛠' };

function setWebhook() {
  const telegramUrl = "https://api.telegram.org/bot" + botToken;
  const url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  Logger.log(UrlFetchApp.fetch(url));
}

function doPost(e) {
  // получаем сигнал от бота
  let update = JSON.parse(e.postData.contents);
  console.log(update.message)
  alertBOT(update);
};

function alertBOT(update) {
  // проверяем тип полученного, нам нужен только тип "сообщение"
  if (update.hasOwnProperty('message')) {
    let msg = update.message;
    let inputChatID = msg.chat.id;
    Logger.log(parseInt(inputChatID, 10))
    Logger.log(msg)
    // проверяем, является ли сообщение командой к боту
    if (msg.hasOwnProperty('entities') && msg.entities[0].type == 'bot_command') {
      let id_names = customList.getRange(2, 1, customList.getLastRow() - 1, 2).getValues();  // импорт таблицы ID и имён сотрудников из листа
      let idNamesObj = {};
      id_names.forEach(el => idNamesObj[el[0]] = el[1]);
      let botData = botDataList.getValues().flat();
      let chats = JSON.parse(botData[0]);           // чаты
      let attentionLists = JSON.parse(botData[1]);  // списки оповещений
      let msg_txt = msg.text.split(' ');
      let header = '🤷 Ошибка!';
      let body = `Сотрудник с ID ${msg_txt[1]} не найден.\n` +
        `Воспользуйтесь помощью @corpUfanetbot для поиска верного ID и укажите его рядом с командой\n(например ${msg_txt[0]} 1234)`;
      let existsID = msg_txt.length > 1 && idNamesObj.hasOwnProperty(msg_txt[1]); // бывший номер строки айди
      // проверяем на название команды
      let id;
      let fullName;
      let chatObj;
      let personalID;
      let dateListValues;
      let send;
      let headers = '';
      let bodies = '';
      switch (msg_txt[0]) {
        case '/start':
        case '/help':
          header = 'ℹПомощь';
          body = '/my число - Для указания своего ID и включения оповещений\n(например /my 1234)\n\n' +
            '/add число - Для добавления ID в список отслеживаемых\n(например /add 1234)\n\n' +
            '/delmi - Для отключения оповещений о своём инструменте и удостоверениях\n\n' +
            '/del - Для очистки списка дополнительных ID для оповещений, добавьте ID если хотите удалить один\n(например /del 1234)\n\n' +
            '/attentions - Для получения списка приближающихся к просрочке проверок знаний и инструмента\n\n' +
            '/sum - Для просмотра сроков всего что есть в наличии, для просмотра чужих данных укажите ID\n(например /sum 1234)\n\n' +
            '/list - Для просмотра списка подключенных оповещений';
          break;
        case '/my':
          if (msg_txt.length > 1 && existsID) {
            id = msg_txt[1];
            fullName = idNamesObj[id];
            my(inputChatID, id, chats, attentionLists);
            header = '📜 Успешно!';
            body = `В качестве основного ID выбран ${id} (<strong>${fullName}</strong>).\n` +
              `Теперь вам будут приходить оповещения о приближении сроков поверок по этому сотруднику.`;
          };
          break;
        case '/add':
          if (msg_txt.length > 1 && existsID) {
            id = msg_txt[1];
            fullName = idNamesObj[id];
            add(inputChatID, id, chats, attentionLists);
            header = '🔔 Успешно!';
            body = `ID ${id} (<strong>${fullName}</strong>) добавлен в список отслеживаемых.\n` +
              `Теперь вам будут приходить оповещения о приближении сроков поверок по этому сотруднику.`;
          };
          break;
        case '/delmi':
          delmi(inputChatID, chats, attentionLists);
          header = '🗑 Успешно!';
          body = `Основной ID очищен.\n` +
            `Вам больше не будут приходить уведомления о нём.`;
          break;
        case '/del':
          chatObj = chats.hasOwnProperty(inputChatID) ? chats[inputChatID] : JSON.parse(defaultObj)
          if (msg_txt.length > 1 && chatObj.added.includes(msg_txt[1])) {
            id = msg_txt[1];
            fullName = idNamesObj[id];
            let delResult = delID(inputChatID, id, fullName, chats, attentionLists);
            header = delResult[0];
            body = delResult[1];
            break;
          } else if (msg_txt.length == 1) {
            delAllAdded(inputChatID, chats, attentionLists);
            header = '🔇 Успешно!';
            body = `Список дополнительных отслеживаемых ID очищен.\n` +
              `Вам больше не будут приходить уведомления о них.`;
            break;
          };
          body = `Сотрудник с ID ${msg_txt[1]} не найден.\n` +
            `Воспользуйтесь командой /list для поиска ID и укажите его рядом с командой\n(например ${msg_txt[0]} 1234).`;
          break;
        case '/attentions':
          chatObj = chats.hasOwnProperty(inputChatID) ? chats[inputChatID] : JSON.parse(defaultObj);
          id = chatObj.id
          fullName = idNamesObj.hasOwnProperty(id) ? idNamesObj[id] : ""
          if (id != "" && fullName != "") {
            dateListValues = dateList.getRange(3, 6, dateList.getLastRow() - 2, 8).getValues();         // получаем значения с листа дат
            personalID = `${fullName} | ${id}`;
            send = attentions(dateListValues, personalID);
            headers = send[0];
            bodies = send[1];
            header = headers[0]
            body = bodies[0]
            for (let i = 1; i < headers.length; i++) {
              body += headers[i];
              body += bodies[i];
            };
          } else {
            header = '⛔ Ошибка!';
            body = 'Не выбран основной ID. Воспользуйтесь командой /my для выбора основного ID.';
          }
          sendMessage(header, body, inputChatID);
          header = 0;
          break;
        case '/sum':
          if (msg_txt.length > 1 && existsID) {
            id = msg_txt[1];
            fullName = idNamesObj[id]
          } else if (msg_txt.length == 1) {
            chatObj = chats.hasOwnProperty(inputChatID) ? chats[inputChatID] : JSON.parse(defaultObj);
            id = chatObj.id
            fullName = idNamesObj.hasOwnProperty(id) ? idNamesObj[id] : ""
          } else { break };
          personalID = `${fullName} | ${id}`;
          dateListValues = dateList.getRange(3, 6, dateList.getLastRow() - 2, 8).getValues();         // получаем значения с листа дат
          send = summInf(dateListValues, personalID);
          headers = send[0];
          bodies = send[1];
          header = headers[0]
          body = bodies[0]
          for (let i = 1; i < headers.length; i++) {
            body += headers[i];
            body += bodies[i];
          };
          sendMessage(header, body, inputChatID);
          header = 0;
          break;
        case '/list':
          header = '🗃 Список оповещений:';
          body = list(inputChatID, chats, idNamesObj);
          break;
        default:
          header = '🤷 Ошибка!';
          body = `Команды ${msg_txt[0]} не существует, воспользуйтесь командой /help для просмотра доступных команд\n`;
          break;
      };
      if (header) {
        sendMessage(header, body, inputChatID);
      };
    };
  };
};

function sendMessage(header, body, chat_id) {
  body = body.length < 3700 ? body : body.slice(0, 3700) + '…\n\n весь список не поместился. Подробности уточняйте у руководителя.';
  let message = '<strong>' + header + '</strong> \n\n' + body;

  //формируем с ним сообщение
  let payload = {
    'method': 'sendMessage',
    'chat_id': String(chat_id),
    'text': message,
    'parse_mode': 'HTML'
  };
  let data = {
    "method": "post",
    "payload": payload
  };

  // и отправляем его боту
  console.log(('https://api.telegram.org/bot' + botToken + '/' + JSON.stringify(data)).length)
  UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/', data);

};
function my(chat, id, chatsObj, notifyObj) {
  // функция для добавления основного ID в таблицу
  let cpChatsObj = JSON.stringify(chatsObj);
  let cpNotifyObj = JSON.stringify(notifyObj);
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);
  let notifyList = notifyObj.hasOwnProperty(id) ? notifyObj[id] : [];
  if (notifyObj.hasOwnProperty(chatObj.id)) {
    notifyObj[chatObj.id] = notifyObj[chatObj.id].filter(el => el != chat);
    if (notifyObj[chatObj.id].length == 0) { delete notifyObj[chatObj.id] }
  }
  chatObj.id = id;
  chatObj.added = chatObj.added.filter(el => el != id);
  chatsObj[chat] = chatObj;
  if (!notifyList.includes(chat)) { notifyList.push(chat) };
  notifyObj[id] = notifyList;
  let strChatsObj = JSON.stringify(chatsObj);
  let strNotifyObj = JSON.stringify(notifyObj);
  if (strChatsObj != cpChatsObj || strNotifyObj != cpNotifyObj) {
    botDataList.setValues([[strChatsObj], [strNotifyObj]]);
  };
};

function add(chat, id, chatsObj, notifyObj) {
  // функция для добавления дополнительного ID в таблицу
  let cpChatsObj = JSON.stringify(chatsObj);
  let cpNotifyObj = JSON.stringify(notifyObj);
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);
  let notifyList = notifyObj.hasOwnProperty(id) ? notifyObj[id] : [];
  if (chatObj.id != id && !chatObj.added.includes(id)) { chatObj.added.push(id) };
  chatsObj[chat] = chatObj;
  if (!notifyList.includes(chat)) { notifyList.push(chat) };
  notifyObj[id] = notifyList;
  let strChatsObj = JSON.stringify(chatsObj);
  let strNotifyObj = JSON.stringify(notifyObj);
  if (strChatsObj != cpChatsObj || strNotifyObj != cpNotifyObj) {
    botDataList.setValues([[strChatsObj], [strNotifyObj]]);
  };
};

function delmi(chat, chatsObj, notifyObj) {
  // функция для удаления основного ID в таблице
  let cpChatsObj = JSON.stringify(chatsObj);
  let cpNotifyObj = JSON.stringify(notifyObj);
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);
  let id = chatObj.id
  let notifyList = notifyObj.hasOwnProperty(id) ? notifyObj[id] : [];

  chatObj.id = '';
  if (chatObj.added.length == 0) {
    delete chatsObj[chat]
  } else {
    chatsObj[chat] = chatObj
  };

  notifyList = notifyList.filter(el => el != chat);
  if (notifyList.length == 0) {
    delete notifyObj[id]
  } else {
    notifyObj[id] = notifyList
  };

  let strChatsObj = JSON.stringify(chatsObj);
  let strNotifyObj = JSON.stringify(notifyObj);
  if (strChatsObj != cpChatsObj || strNotifyObj != cpNotifyObj) {
    botDataList.setValues([[strChatsObj], [strNotifyObj]]);
  };
};

function delID(chat, id, name, chatsObj, notifyObj) {
  // функция для удаления ID из отслеживаемых ID в таблице
  let header;
  let body;
  let cpChatsObj = JSON.stringify(chatsObj);
  let cpNotifyObj = JSON.stringify(notifyObj);
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);
  let notifyList = notifyObj.hasOwnProperty(id) ? notifyObj[id] : [];

  notifyList = chatObj.id != id ? notifyList.filter(el => el != chat) : notifyList;
  if (notifyList.length == 0) {
    delete notifyObj[id]
  } else {
    notifyObj[id] = notifyList
  };

  chatObj.added = chatObj.added.filter(el => el != id)
  if (chatObj.added.length == 0 && chatObj.id == '') {
    delete chatsObj[chat]
  } else {
    chatsObj[chat] = chatObj
  };

  let strChatsObj = JSON.stringify(chatsObj);
  let strNotifyObj = JSON.stringify(notifyObj);
  if (strChatsObj != cpChatsObj || strNotifyObj != cpNotifyObj) {
    botDataList.setValues([[strChatsObj], [strNotifyObj]]);
    header = '🔕 Успешно!';
    body = `ID ${id} (<strong>${name}</strong>) удалён из списка отслеживаемых.\n` +
      `Вам больше не будут приходить уведомления о нём.`;
  } else {
    header = '🤷 Ошибка!';
    body = `Сотрудник с ID ${id} не найден в списке добавленных.\n` +
      `Воспользуйтесь помощью /list для поиска верного ID и укажите его рядом с командой\n` +
      `(например /del 1234)\n` +
      `Если вы хотите удалить основной ID, воспользуйтесь командой /delmi.`;
  };
  return [header, body]
};

function delAllAdded(chat, chatsObj, notifyObj) {
  // функция для очистки списка отслеживаемых ID в таблице
  let cpChatsObj = JSON.stringify(chatsObj);
  let cpNotifyObj = JSON.stringify(notifyObj);
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);

  for (let id of chatObj.added) {
    notifyObj[id] = notifyObj[id].filter(el => el != chat);
    if (notifyObj[id].length == 0) {
      delete notifyObj[id]
    };
  }

  chatObj.added = []
  if (chatObj.id == '') {
    delete chatsObj[chat]
  } else {
    chatsObj[chat] = chatObj
  };

  let strChatsObj = JSON.stringify(chatsObj);
  let strNotifyObj = JSON.stringify(notifyObj);
  if (strChatsObj != cpChatsObj || strNotifyObj != cpNotifyObj) {
    botDataList.setValues([[strChatsObj], [strNotifyObj]]);
  }
};

function list(chat, chatsObj, idNames) {
  // функция для просмотра списка отслеживаемых ID в таблице
  let chatObj = chatsObj.hasOwnProperty(chat) ? chatsObj[chat] : JSON.parse(defaultObj);
  let result = '';
  if (chatObj.id == '') {
    result = '⚠ Основной МОЛ не выбран.';
  } else {
    result = `📜 <strong>Основной МОЛ</strong>\n✓ ${idNames[chatObj.id]} | ${chatObj.id}`;
  };
  if (chatObj.added.length != 0) {
    result += '\n\n🔔 <strong>Дополнительные МОЛы</strong>';
    for (let id of chatObj.added) {
      if (!idNames.hasOwnProperty(id)) { continue };
      result += `\n✓ ${idNames[id]} | ${id}`;
    };
  } else {
    result += `\n\n📭 Дополнительно никто не отслеживается.`;
  };
  return result;
};

function attentions(data, personalID) {
  let header = [`👷 ${personalID}`];
  let body = [''];
  let endDate;
  if (personalID == '' || personalID == ' | ') {
    header[0] = '⛔ Ошибка!';
    body[0] = 'Не выбран основной ID. Воспользуйтесь командой /my для выбора основного ID.';
    return [header, body];
  };
  let values = arrayGen(data, personalID);
  let ended = values[0];
  let nearest = values[1];
  if (ended.length == 1 && nearest.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>\n');
    body.push('Удостоверений и СИЗ с истекающим сроком проверки не найдено!');
    return [header, body];
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][2]}</strong>\n`;
    };
  };
  if (nearest.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < nearest.length; i++) {
      let emodji = emodjiDict[nearest[i][1]];
      endDate = Utilities.formatDate(new Date(nearest[i][7]), "GMT+5", "dd.MM.yyyy")
      body[body.length - 1] += `<strong>${emodji} ${nearest[i][2]}</strong> действует до ${endDate}\n`;
    };
  };
  return [header, body];
};

function summInf(data, personalID) {
  let header = [`👷 ${personalID}`];
  let body = [''];
  let endDate
  if (personalID == '' || personalID == ' | ') {
    header[0] = '⛔ Ошибка!';
    body[0] = 'Не выбран основной ID. Воспользуйтесь командой /my для выбора основного ID.';
    return [header, body];
  };
  let values = arrayGen(data, personalID);
  let ended = values[0];
  let nearest = values[1];
  let near = values[2];
  let ok = values[3];
  if (ended.length == 1 && nearest.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>\n');
    body.push('Удостоверений и СИЗ с истекающим сроком проверки не найдено!\n');
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][2]}</strong>\n`;
    };
  };
  if (nearest.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < nearest.length; i++) {
      let emodji = emodjiDict[nearest[i][1]];
      endDate = Utilities.formatDate(new Date(nearest[i][7]), "GMT+5", "dd.MM.yyyy")
      body[body.length - 1] += `<strong>${emodji} ${nearest[i][2]}</strong> действует до ${endDate}\n`;
    };
  };
  if ((ok.length + near.length) > 1) {
    header.push('\n<ins><strong>✅ В норме:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < near.length; i++) {
      let emodji = emodjiDict[near[i][1]];
      endDate = Utilities.formatDate(new Date(near[i][7]), "GMT+5", "dd.MM.yyyy")
      body[body.length - 1] += `<strong>${emodji} ${near[i][2]}</strong> действует до ${endDate}\n`;
    };
    for (let i = 1; i < ok.length; i++) {
      let emodji = emodjiDict[ok[i][1]];
      endDate = Utilities.formatDate(new Date(ok[i][7]), "GMT+5", "dd.MM.yyyy")
      body[body.length - 1] += `<strong>${emodji} ${ok[i][2]}</strong> действует до ${endDate}\n`;
    };
  };
  return [header, body];
};

function autoAlerts() {
  // функция для автоматического оповещения всех подключенных к боту пользователей о просроченных или близких к просрочке инструментах и удостоверениях сотрудников
  // у каждого пользователя свой список отслеживаемых сотрудников - оповещения приходят только об имеющихся в списке сотрудниках
  let id_names = customList.getRange(2, 1, customList.getLastRow() - 1, 2).getValues();  // импорт таблицы ID и имён сотрудников из листа
  let idNamesObj = {};
  id_names.forEach(el => idNamesObj[el[0]] = el[1]);
  let botData = botDataList.getValues().flat();
  let chats = JSON.parse(botData[0]);           // чаты
  let attentionLists = JSON.parse(botData[1]);  // списки оповещений

  let dateListValues = autoCleaner(idNamesObj, chats, attentionLists);

  let header;
  let body;
  let chatList;
  let fullName;
  let personalID;
  let send;
  let headers;
  let bodies;
  for (let id in attentionLists) {
    if (!idNamesObj.hasOwnProperty(id)) { continue };
    header = '';
    body = '';
    chatList = attentionLists[id];
    fullName = idNamesObj[id]
    personalID = `${fullName} | ${id}`;
    send = attentions(dateListValues, personalID);
    headers = send[0];
    if (headers[1] == '<ins><strong>👍 Отлично!</strong></ins>\n') { continue };
    bodies = send[1];
    header = headers[0]
    body = bodies[0]
    for (let i = 1; i < headers.length; i++) {
      body += headers[i];
      body += bodies[i];
    };
    for (let num of chatList) {
      sendMessage(header, body, num);
    };
  };
};

function autoCleaner(idNames = 0, chats = 0, attentionLists = 0) {
  // очистка таблицы от записей о людях отсутствующих в списке сотрудников
  if (idNames === 0 || chats === 0 || attentionLists === 0) {
    id_names = customList.getRange(2, 1, customList.getLastRow() - 1, 2).getValues();  // импорт таблицы ID и имён сотрудников из листа
    idNames = {};
    id_names.forEach(el => idNames[el[0]] = el[1]);
    botData = botDataList.getValues().flat();
    chats = JSON.parse(botData[0]);           // чаты
    attentionLists = JSON.parse(botData[1]);  // списки оповещений
  }
  let data = dateList.getRange(3, 4, dateList.getLastRow() - 2, 10).getValues();         // получаем значения с листа дат
  let newData = [];
  let toExitData = []
  for (let line of data) {
    id = line[0]
    if (idNames.hasOwnProperty(id)) {
      newData.push(line);
      toExitData.push(line.slice(2))
    } else {
      newData.push(["", "", "", "", "", "", "", "", "", ""])
    }
  }

  if (JSON.stringify(data) != JSON.stringify(newData)) {
    newData = newData.map(el => el.slice(2, 8));
    dateList.getRange(3, 6, newData.length, 6).setValues(newData);
  }

  let cpAttentionLists = JSON.parse(JSON.stringify(attentionLists));
  let cpChats = JSON.stringify(chats);
  let chatObj;
  for (let id in cpAttentionLists) {
    if (!idNames.hasOwnProperty(id)) {
      for (let chat of attentionLists[id]) {
        chatObj = chats[chat]
        if (chatObj.id == id) {
          chatObj.id = ''
        } else {
          chatObj.added = chatObj.added.filter(el => el != id)
        }
        if (chatObj.added.length == 0 && chatObj.id == '') {
          delete chats[chat]
        } else {
          chats[chat] = chatObj
        };
      }
      delete attentionLists[id]
    }
  }
  let strAttentionsLists = JSON.stringify(attentionLists)
  let strChats = JSON.stringify(chats)
  if(JSON.stringify(cpAttentionLists) != strAttentionsLists || cpChats != strChats) {
    newData = [[strChats], [strAttentionsLists]];
    botDataList.setValues(newData);
  }

  return toExitData
}
