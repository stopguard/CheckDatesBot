const svcSheet = ss.getSheetByName('[svc]');
const svc2Sheet = ss.getSheetByName('[svc]2');
const botToken = '1775200394:AAGYDccjkESNhsIdSafAgGbBka-_ZtiS1Yg';  // данный токен уже недействителен. если будет интересно могу организовать.
const defaultObj = JSON.stringify({ 'id': '', 'name': '', 'str': -1, 'added': {} });
const defaultAdded = JSON.stringify({ 'id': '', 'name': '', 'str': -1 });
const emodjiDict = { 'Удостоверение)': '📃', 'Аттестация)': '🖋', 'Инструмент)': '🛠' };

function doPost(e) {
  // получаем сигнал от бота
  let update = JSON.parse(e.postData.contents);
  alertBOT(update);
};

function setWebhook() {
  // одноразовая функция для подключения хуков
  const webAppUrl = "https://script.google.com/macros/s/AKfycbxHbBTo3wJ-5sk7zIEfqxsbF3BeEhpypC53RfQXGDJOnZDUk4__QhOvfpc6X33egKnL1g/exec";
  const telegramUrl = "https://api.telegram.org/bot" + botToken; 
  const url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  let response = UrlFetchApp.fetch(url);
  console.log(response)
}

function alertBOT(update) {
  // проверяем тип полученного, нам нужен только тип "сообщение"
  if (update.hasOwnProperty('message')) {
    let msg = update.message;
    let inputChatID = msg.chat.id;

    // проверяем, является ли сообщение командой к боту
    if (msg.hasOwnProperty('entities') && msg.entities[0].type == 'bot_command') {
      let id_names = docsList.getRange(5, 1, docsList.getLastRow() - 4, 2).getValues();  // импорт таблицы табельных номеров и имён сотрудников из листа
      let ids = id_names.map(itm => String(itm[0]));      // айдишники из полного списка
      let names = id_names.map(itm => String(itm[1]));    // имена из полного списка
      let svc2Values = svc2Sheet.getRange(1, 1, svc2Sheet.getLastRow() + 1, 3).getValues();   // стягиваем данные из таблицы подключенных чатов
      let chats = svc2Values.map(itm => String(itm[0]));  // чаты
      let emptyLine = chats.indexOf('') == -1 ? chats.length : chats.indexOf(''); // первая свободная ячейка в листе чатов
      let chatLine = chats.indexOf(String(inputChatID)) != -1 ? chats.indexOf(String(inputChatID)) : emptyLine;
      let msg_txt = msg.text.split(' ');
      let header = '🤷 Ошибка!';
      let body = `Сотрудник с табельным номером ${msg_txt[1]} не найден.\n` +
        `Воспользуйтесь помощью @corpUfanetbot для поиска верного табельного номера и укажите его рядом с командой\n(например ${msg_txt[0]} 1234)`;
      let idLine = msg_txt.length > 1 ? ids.indexOf(msg_txt[1]) : -1;
      // проверяем на название команды
      let data;
      let chatObj;
      let personalID;
      let toDay;
      let docsListValues;
      let send;
      let headers = '';
      let bodies = '';
      switch (msg_txt[0]) {
        case '/start':
        case '/help':
          header = 'ℹПомощь';
          body = '/my число - Для указания своего табельного номера и включения оповещений\n(например /my 1234)\n\n' +
            '/add число - Для добавления табельного номера в список отслеживаемых\n(например /add 1234)\n\n' +
            '/delmi - Для отключения оповещений о своём инструменте и удостоверениях\n\n' +
            '/del - Для очистки списка дополнительных табельных номеров для оповещений, добавьте табельный номер если хотите удалить один\n(например /del 1234)\n\n' +
            '/attentions - Для получения списка приближающихся к просрочке проверок знаний и инструмента\n\n' +
            '/docs - Для просмотра сроков имеющихся удостоверений\n\n' +
            '/instr - Для просмотра сроков имеющегося инструмента\n\n' +
            '/sum - Для просмотра сроков всего что есть в наличии, для просмотра чужих данных укажите табельный номер\n(например /sum 1234)\n\n' +
            '/list - Для просмотра списка подключенных оповещений';
          break;
        case '/my':
          if (msg_txt.length > 1 && idLine >= 0) {
            my(inputChatID, ids[idLine], names[idLine], idLine, chatLine);
            header = '📜 Успешно!';
            body = `В качестве основного табельного номера выбран ${ids[idLine]} (<strong>${names[idLine]}</strong>).\n` +
              `Теперь вам будут приходить оповещения о приближении сроков поверок по этому сотруднику.`;
            break;
          };
          break;
        case '/add':
          if (msg_txt.length > 1 && idLine >= 0) {
            add(inputChatID, ids[idLine], names[idLine], idLine, chatLine);
            header = '🔔 Успешно!';
            body = `Табельный номер ${ids[idLine]} (<strong>${names[idLine]}</strong>) добавлен в список отслеживаемых.\n` +
              `Теперь вам будут приходить оповещения о приближении сроков поверок по этому сотруднику.`;
            break;
          };
          break;
        case '/delmi':
          delmi(inputChatID, chatLine);
          header = '🗑 Успешно!';
          body = `Основной табельный номер очищен.\n` +
            `Вам больше не будут приходить уведомления о нём.`;
          break;
        case '/del':
          if (msg_txt.length > 1 && idLine >= 0) {
            delID(inputChatID, ids[idLine], idLine, chatLine);
            header = '🔕 Успешно!';
            body = `Табельный номер ${ids[idLine]} (<strong>${names[idLine]}</strong>) удалён из списка отслеживаемых.\n` +
              `Вам больше не будут приходить уведомления о нём.`;
            break;
          } else if (msg_txt.length == 1) {
            delAllAdded(inputChatID, chatLine);
            header = '🔇 Успешно!';
            body = `Список дополнительных отслеживаемых табельных номеров очищен.\n` +
              `Вам больше не будут приходить уведомления о них.`;
            break;
          };
          body = `Сотрудник с табельным номером ${msg_txt[1]} не найден.\n` +
            `Воспользуйтесь командой /list для поиска табельного номера и укажите его рядом с командой\n(например ${msg_txt[0]} 1234).`;
          break;
        case '/attentions':
          data = svc2Sheet.getRange(chatLine + 1, 2).getValue();
          chatObj = data == '' ? JSON.parse(defaultObj) : JSON.parse(data);
          personalID = [chatObj.name, chatObj.id, chatObj.str + 4];
          toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату
          docsListValues = docsList.getRange(1, 1, docsList.getLastRow(), docsList.getLastColumn()).getValues();      // получаем значения с листа удостоверений
          instrListValues = instrList.getRange(1, 1, instrList.getLastRow(), instrList.getLastColumn()).getValues();  //                           инструмента
          send = attentions(personalID, toDay, docsListValues, instrListValues);
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
        case '/docs':
          data = svc2Sheet.getRange(chatLine + 1, 2).getValue();
          chatObj = data == '' ? JSON.parse(defaultObj) : JSON.parse(data);
          personalID = [chatObj.name, chatObj.id, chatObj.str + 4]
          toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату
          docsListValues = docsList.getRange(1, 1, docsList.getLastRow(), docsList.getLastColumn()).getValues();      // получаем значения с листа удостоверений
          send = docs(personalID, toDay, docsListValues);
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
        case '/instr':
          data = svc2Sheet.getRange(chatLine + 1, 2).getValue();
          chatObj = data == '' ? JSON.parse(defaultObj) : JSON.parse(data);
          personalID = [chatObj.name, chatObj.id, chatObj.str + 4]
          toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату
          instrListValues = instrList.getRange(1, 1, instrList.getLastRow(), instrList.getLastColumn()).getValues();  // получаем значения с листа инструмента
          send = instr(personalID, toDay, instrListValues);
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
        case '/sum':
          data = svc2Sheet.getRange(chatLine + 1, 2).getValue();
          chatObj = data == '' ? JSON.parse(defaultObj) : JSON.parse(data);
          if (msg_txt.length > 1 && idLine >= 0) {
            personalID = [names[idLine], msg_txt[1], idLine + 4];
          } else if (msg_txt.length == 1) {
            personalID = [chatObj.name, chatObj.id, chatObj.str + 4];
          } else { break };
          toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату
          docsListValues = docsList.getRange(1, 1, docsList.getLastRow(), docsList.getLastColumn()).getValues();      // получаем значения с листа удостоверений
          instrListValues = instrList.getRange(1, 1, instrList.getLastRow(), instrList.getLastColumn()).getValues();  //                           инструмента
          send = summInf(personalID, toDay, docsListValues, instrListValues);
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
          body = list(chatLine);
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
  UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/', data);
  console.log(('https://api.telegram.org/bot' + botToken + '/' + JSON.stringify(data)).length)

};

function my(chat, id, name, idLine, chatLine) {
  // функция для добавления основного табельного номера в таблицу
  let data = svc2Sheet.getRange(1, 1, Math.max(svc2Sheet.getLastRow(), idLine + 1, chatLine + 1), 3).getValues();
  let cpData = JSON.stringify(data);
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  let idObj = data[idLine][2] == '' ? {} : JSON.parse(data[idLine][2]);
  let oldIDObj = chatObj.str >= 0 ? JSON.parse(data[chatObj.str][2]) : {};
  if (chatObj.id != id) {
    if (JSON.stringify(oldIDObj) != '{}') {
      delete oldIDObj[chat];
      delete chatObj.added[chatObj.id];
      data[chatObj.str][2] = JSON.stringify(oldIDObj);
    };
    delete chatObj.added[id];
    chatObj.id = id;
    chatObj.name = name;
    chatObj.str = idLine;
    data[chatLine][0] = chat;
    data[chatLine][1] = JSON.stringify(chatObj);
  }
  idObj[chat] = chat;
  data[idLine][2] = JSON.stringify(idObj);
  if (JSON.stringify(data) != cpData) {
    svc2Sheet.getRange(1, 1, data.length, 3).setValues(data);
  };
};

function add(chat, id, name, idLine, chatLine) {
  // функция для добавления дополнительного табельного номера в таблицу
  let data = svc2Sheet.getRange(1, 1, Math.max(svc2Sheet.getLastRow(), idLine + 1, chatLine + 1), 3).getValues();
  let cpData = JSON.stringify(data);
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  let idObj = data[idLine][2] == '' ? {} : JSON.parse(data[idLine][2]);
  if (chatObj.id != id) {
    chatObj.added[id] = JSON.parse(defaultAdded);
    chatObj.added[id].id = id;
    chatObj.added[id].name = name;
    chatObj.added[id].str = idLine;
    data[chatLine][0] = chat;
    data[chatLine][1] = JSON.stringify(chatObj);
    idObj[chat] = chat;
    data[idLine][2] = JSON.stringify(idObj);
    if (JSON.stringify(data) != cpData) {
      svc2Sheet.getRange(1, 1, data.length, 3).setValues(data);
    };
  };
};

function delmi(chat, chatLine) {
  // функция для удаления основного табельного номера в таблице
  let data = svc2Sheet.getRange(1, 1, svc2Sheet.getLastRow(), 3).getValues();
  let cpData = JSON.stringify(data);
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  let oldIDObj = chatObj.str >= 0 ? JSON.parse(data[chatObj.str][2]) : {};
  if (chatObj.id != '') {
    delete oldIDObj[chat];
    delete chatObj.added[chatObj.id];
    data[chatObj.str][2] = JSON.stringify(oldIDObj);
    chatObj.id = '';
    chatObj.name = '';
    chatObj.str = -1;
    data[chatLine][0] = chat;
    data[chatLine][1] = JSON.stringify(chatObj);
  };
  if (data[chatLine][1] == defaultObj) {
    data[chatLine][0] = '';
    data[chatLine][1] = '';
  };
  if (JSON.stringify(data) != cpData) {
    svc2Sheet.getRange(1, 1, data.length, 3).setValues(data);
  };
};

function delID(chat, addedID, idLine, chatLine) {
  // функция для удаления ID из отслеживаемых табельных номеров в таблице
  let data = svc2Sheet.getRange(1, 1, svc2Sheet.getLastRow(), 3).getValues();
  let cpData = JSON.stringify(data);
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  let idObj = data[idLine][2] == '' ? {} : JSON.parse(data[idLine][2]);
  if (JSON.stringify(chatObj.added) != '{}') {
    if (addedID != chatObj.id) {
      delete idObj[chat];
    };
    delete chatObj.added[addedID];
    data[chatLine][0] = chat;
    data[chatLine][1] = JSON.stringify(chatObj);
  };
  data[idLine][2] = JSON.stringify(idObj);
  if (data[chatLine][1] == defaultObj) {
    data[chatLine][0] = '';
    data[chatLine][1] = '';
  };
  if (JSON.stringify(data) != cpData) {
    svc2Sheet.getRange(1, 1, data.length, 3).setValues(data);
  };
};

function delAllAdded(chat, chatLine) {
  // функция для очистки списка отслеживаемых табельных номеров в таблице
  let data = svc2Sheet.getRange(1, 1, svc2Sheet.getLastRow(), 3).getValues();
  let cpData = JSON.stringify(data);
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  if (JSON.stringify(chatObj.added) != '{}') {
    let chatObjTmp = JSON.parse(JSON.stringify(chatObj));
    for (let idInAdded in chatObj.added) {
      let idObjInAdded = chatObj.added[idInAdded];
      Logger.log(JSON.stringify(idObjInAdded));
      let idObj = JSON.parse(data[idObjInAdded.str][2]);
      if (idObjInAdded.id != chatObj.id) {
        delete idObj[chat];
      };
      delete chatObjTmp.added[idObjInAdded.id];
      data[idObjInAdded.str][2] = JSON.stringify(idObj);
    };
    data[chatLine][0] = chat;
    data[chatLine][1] = JSON.stringify(chatObjTmp);
  };
  if (data[chatLine][1] == defaultObj) {
    data[chatLine][0] = '';
    data[chatLine][1] = '';
  };
  if (JSON.stringify(data) != cpData) {
    svc2Sheet.getRange(1, 1, data.length, 3).setValues(data);
  };
};



function list(chatLine) {
  // функция для просмотра списка отслеживаемых табельных номеров в таблице
  let data = svc2Sheet.getRange(1, 1, svc2Sheet.getLastRow(), 3).getValues();
  let chatObj = data[chatLine][1] == '' ? JSON.parse(defaultObj) : JSON.parse(data[chatLine][1]);
  let result = '';
  if (chatObj.id == '') {
    result = '⚠ Основной МОЛ не выбран.';
  } else {
    result = `📜 <strong>Основной МОЛ</strong>\n✓ ${chatObj.name} | ${chatObj.id}`;
  };
  if (JSON.stringify(chatObj.added) != '{}') {
    result += '\n\n🔔 <strong>Дополнительные МОЛы</strong>';
    for (let idInAdded in chatObj.added) {
      let idObjInAdded = chatObj.added[idInAdded];
      result += `\n✓ ${idObjInAdded.name} | ${idObjInAdded.id}`;
    };
  } else {
    result += `\n\n📭 Дополнительно никто не отслеживается.`;
  };
  return result;
};

function attentions(personalID, toDay, docsListValues, instrListValues) {
  let header = [`👷 ${personalID[0]} | ${personalID[1]}`];
  let body = [''];
  if (personalID[1] == '') {
    header[0] = '⛔ Ошибка!';
    body[0] = 'Не выбран основной табельный номер. Воспользуйтесь командой /my для выбора основного табельного номера.';
    return [header, body];
  };
  let values = arrayGen(docsListValues, instrListValues, personalID, toDay);
  let ended = values[0];
  let close = values[1];
  if (ended.length == 1 && close.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>');
    body.push('Удостоверений и СИЗ с истекающим сроком проверки не найдено!');
    return [header, body];
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][1]}</strong>\n`;
    };
  };
  if (close.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < close.length; i++) {
      let emodji = emodjiDict[close[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${close[i][1]}</strong> действует до ${close[i][3]}\n`;
    };
  };
  return [header, body];
};

function docs(personalID, toDay, docsListValues) {
  let header = [`👷 ${personalID[0]} | ${personalID[1]}`];
  let body = [''];
  if (personalID[1] == '') {
    header[0] = '<strong>⛔ Ошибка!</strong>';
    body[0] = 'Не выбран основной табельный номер. Воспользуйтесь командой /my для выбора основного табельного номера.';
    return [header, body];
  };
  let values = arrayGen(docsListValues, [[]], personalID, toDay);
  let ended = values[0];
  let close = values[1];
  let ok = values[2];
  if (ended.length == 1 && close.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>\n');
    body.push('Удостоверений с истекающим сроком проверки не найдено!\n');
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][1]}</strong>\n`;
    };
  };
  if (close.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < close.length; i++) {
      let emodji = emodjiDict[close[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${close[i][1]}</strong> действует до ${close[i][3]}\n`;
    };
  };
  if (ok.length > 1) {
    header.push('\n<ins><strong>✅ В норме:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ok.length; i++) {
      let emodji = emodjiDict[ok[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ok[i][1]}</strong> действует до ${ok[i][3]}\n`;
    };
  };
  return [header, body];
};

function instr(personalID, toDay, instrListValues) {
  let header = [`👷 ${personalID[0]} | ${personalID[1]}`];
  let body = [''];
  if (personalID[1] == '') {
    header[0] = '<strong>⛔ Ошибка!</strong>';
    body[0] = 'Не выбран основной табельный номер. Воспользуйтесь командой /my для выбора основного табельного номера.';
    return [header, body];
  };
  let values = arrayGen([[]], instrListValues, personalID, toDay);
  let ended = values[0];
  let close = values[1];
  let ok = values[2];
  if (ended.length == 1 && close.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>\n');
    body.push('СИЗ с истекающим сроком проверки не найдено!\n');
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][1]}</strong>\n`;
    };
  };
  if (close.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < close.length; i++) {
      let emodji = emodjiDict[close[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${close[i][1]}</strong> действует до ${close[i][3]}\n`;
    };
  };
  if (ok.length > 1) {
    header.push('\n<ins><strong>✅ В норме:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ok.length; i++) {
      let emodji = emodjiDict[ok[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ok[i][1]}</strong> действует до ${ok[i][3]}\n`;
    };
  };
  return [header, body];
};

function summInf(personalID, toDay, docsListValues, instrListValues) {
  let header = [`👷 ${personalID[0]} | ${personalID[1]}`];
  let body = [''];
  if (personalID[1] == '') {
    header[0] = '<strong>⛔ Ошибка!</strong>';
    body[0] = 'Не выбран основной табельный номер. Воспользуйтесь командой /my для выбора основного табельного номера.';
    return [header, body];
  };
  let values = arrayGen(docsListValues, instrListValues, personalID, toDay);
  let ended = values[0];
  let close = values[1];
  let ok = values[2];
  if (ended.length == 1 && close.length == 1) {
    header.push('<ins><strong>👍 Отлично!</strong></ins>\n');
    body.push('Удостоверений и СИЗ с истекающим сроком проверки не найдено!\n');
  };
  if (ended.length > 1) {
    header.push('\n<ins><strong>🛑 Просрочены:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ended.length; i++) {
      let emodji = emodjiDict[ended[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ended[i][1]}</strong>\n`;
    };
  };
  if (close.length > 1) {
    header.push('\n<ins><strong>⚠ Осталось до месяца:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < close.length; i++) {
      let emodji = emodjiDict[close[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${close[i][1]}</strong> действует до ${close[i][3]}\n`;
    };
  };
  if (ok.length > 1) {
    header.push('\n<ins><strong>✅ В норме:</strong></ins>\n');
    body.push('');
    for (let i = 1; i < ok.length; i++) {
      let emodji = emodjiDict[ok[i][1].split('(')[1]];
      body[body.length - 1] += `<strong>${emodji} ${ok[i][1]}</strong> действует до ${ok[i][3]}\n`;
    };
  };
  return [header, body];
};

function autoAlerts() {
  let id_names = docsList.getRange(5, 1, docsList.getLastRow() - 4, 2).getValues();  // импорт таблицы табельных номеров и имён сотрудников из листа
  let ids = id_names.map(itm => String(itm[0]));      // айдишники из полного списка
  let names = id_names.map(itm => String(itm[1]));    // имена из полного списка
  let toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату
  let docsListValues = docsList.getRange(1, 1, docsList.getLastRow(), docsList.getLastColumn()).getValues();      // получаем значения с листа удостоверений
  let instrListValues = instrList.getRange(1, 1, instrList.getLastRow(), instrList.getLastColumn()).getValues();  //                           инструмента
  let svc2Values = svc2Sheet.getRange(1, 3, svc2Sheet.getLastRow(), 1).getValues().map(itm => String(itm[0]));
  for (let i = 0; i < svc2Values.length; i++) {
    let header = '';
    let body = '';
    if (svc2Values[i] != '' && svc2Values[i] != '{}') {
      let chatList = Object.keys(JSON.parse(svc2Values[i]));
      let personalID = [names[i], ids[i], i + 4];
      let send = attentions(personalID, toDay, docsListValues, instrListValues);
      let headers = send[0];
      let bodies = send[1];
      header += headers[0]
      for (let num = 0; num < chatList.length; num++) {
        if (headers[1] == '<ins><strong>👍 Отлично!</strong></ins>') { break };
        for (let j = 1; j < headers.length; j++) {
          body += headers[j];
          body += bodies[j];
        };
        sendMessage(header, body, chatList[num]);
      };
    };
  };
};
