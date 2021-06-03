// Структура данных находится в гугл-таблице. Ссылка приложена в описании репозитория
// Все указанные здесь переменные и функции находятся в области видимости бота, находящегося в файле b_BOT.gs

/* Version 02.06.2021 23:50 */
const ss = SpreadsheetApp.getActiveSpreadsheet()                  // получаем доступ  к активной таблице
const personalList = ss.getSheetByName('Управление сотрудником'); //                  к персональному листу
const dateList = ss.getSheetByName('Даты проверок');              //                  к листу с датами
const customList = ss.getSheetByName('Списки');                   //                  к листу со списками
const msToDays = 86400000                                         // переменная для перевода миллисекунд в дни

function onEdit() {
  let sheet = ss.getActiveSheet();
  let actSheetName = sheet.getName()
  let active = ss.getActiveRange();
  let index = active.getRowIndex();
  let lastIndex = active.getLastRow();
  let cellcol = active.getColumnIndex();

  if (actSheetName === 'Даты проверок' && index > 2) {
    // Автозаполнение даты проверки знаний при изменении даты обновления удостоверения
    switch (cellcol) {
      case 10:
        dateList.getRange(index, cellcol + 1).setValue(active.getValue());
        break;
      case 11:
        let str = dateList.getRange(index, 10, 1, 4).getValues().flat(1);
        let checkDate = new Date(str[0]);
        let attestationDate = new Date(str[1]);
        let nextCheckDate = new Date(str[2]);
        let nextAttestationDate = new Date(str[3]);
        if (nextAttestationDate > nextCheckDate || str[0] == "" || checkDate < attestationDate) {
          dateList.getRange(index, cellcol - 1).setValue(attestationDate);
        }
        break;
    }

  } else if (actSheetName === 'Управление сотрудником' && ((cellcol === 2 && index === 2) || (sheet.getRange(3, 11).getValue() == 'Да'))) {
    // Тянем данные о сотруднике при выборе сотрудника на листе персонального списка или при запросе обновления
    personalList.getRange(3, 11).setValue('В процессе')
    importValues();

  } else if (actSheetName === 'Управление сотрудником' && (sheet.getRange(4, 11).getValue() == 'Да')) {
    // Заливаем обновлённые данные в сводные таблицы
    personalList.getRange(4, 11).setValue('В процессе')
    exportValues();
  }

  if (actSheetName === 'Управление сотрудником' && index > 5) {
    switch (cellcol) {
      case 5:
        personalList.getRange(index, cellcol + 1).setValue(active.getValue());
        break;
      case 6:
        let str = sheet.getRange(index, 5, 1, 10).getValues().flat(1);
        let attestationDate = new Date(str[1]);
        let nextAttestationDate = (new Date(attestationDate)).setMonth(attestationDate.getMonth() + str[9]);
        let checkDate = new Date(str[0]);
        let nextCheckDate = (new Date(checkDate)).setMonth(checkDate.getMonth() + str[8]);
        if (nextAttestationDate > nextCheckDate || str[0] == "" || checkDate < attestationDate) {
          personalList.getRange(index, cellcol - 1).setValue(attestationDate);
        }
        break;
      case 2:
        if (index > sheet.getRange(5, 10).getValue()) {
          dropDownLists(index, lastIndex - index + 1);
        }
        break;
    }
  }
}

function dropDownLists(strNum, range) {
  // Зависимые выпадающие списки на листе управления сотрудником
  let itmType = personalList.getRange(strNum, 2).getValue();
  let target = personalList.getRange(strNum, 3, range);
  let dropList = [];
  if (range > 1) { personalList.getRange(strNum, 2, range).setValue(itmType) };
  target.clearDataValidations().clearContent();
  switch (itmType) {
    case "Удостоверение":
      dropList = customList.getRange(3, 12, 100).getValues().flat(1);
      target.clearDataValidations().clearContent();
      target.setDataValidation(SpreadsheetApp.newDataValidation()
        .setAllowInvalid(false)
        .requireValueInList(dropList, true)
        .build())
      break;
    case "Инструмент":
      dropList = customList.getRange(3, 9, 100).getValues().flat();
      target.setDataValidation(SpreadsheetApp.newDataValidation()
        .setAllowInvalid(false)
        .requireValueInList(dropList, true)
        .build())
      break;
  }
}

function importValues() {
  // импорт данных из удостоверений и инструмента в персональный список
  let personalID = personalList.getRange(2, 2).getValue();                                          // получаем строку запроса
  const dateListValues = dateList.getRange(3, 6, dateList.getLastRow() - 2, 8).getValues();         // получаем значения с листа дат
  let result = arrayGen(dateListValues, personalID).flat();                                         // получаем список имущества

  // ====================ОТПРАВКА ДАННЫХ В ТАБЛИЦУ====================
  // Чистим тело таблицы от данных
  personalList.getRange(6, 2, personalList.getLastRow() - 4, 2).clearDataValidations()
  personalList.getRange(6, 1, personalList.getLastRow() - 4, 9).clearContent();
  personalList.getRange(result.length - 24, 2, 30, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation()
      .setAllowInvalid(false)
      .requireValueInList(["Инструмент", "Удостоверение"], true)
      .build())
  let personalListRange = personalList.getRange(6, 1, result.length, 9);  // доступ к диапазону
  personalListRange.setValues(result)                                 // заливка значений в таблицу

  personalList.getRange(3, 11).setValue('Выполнить?')

  //Browser.msgBox(JSON.stringify(valuesList))
}

function insertToArray(toArray, data, mark, interval) {
  // Вставка найденных значений так чтобы удостоверения оказались вверху
  data.push(interval);
  switch (mark) {
    case "Инструмент":
      toArray.push(data);                           // добавляем инструмент в конец результирующего массива
      break;
    case "Удостоверение":
      toArray.splice(1, 0, data);                   // добавляем удостоверения в начало результирующего массива
      break;
  };
  return toArray;
};

function arrayGen(dateListValues, personalID) {
  // создаём заготовку для вывода данных
  let result;
  const toDay = new Date(new Date(Date.now()).getFullYear(),                                        // текущая дата
    new Date(Date.now()).getMonth(),
    new Date(Date.now()).getDate());
  let ended = [["", "", "Просрочены:", "", "", "", "", "", ""]];
  let nearest = [["", "", "Осталось до месяца:", "", "", "", "", "", ""]];
  let near = [["", "", "Осталось до 90 дней:", "", "", "", "", "", ""]];
  let other = [["", "", "Остальные:", "", "", "", "", "", ""]];
  let add = [["", "", "Для добавления:", "", "", "", "", "", ""]];

  // Проход по удостоверениям сотрудника с добавлением в список в соответствии со статусом
  let fullName;
  let itemType;
  let itemAttestationDate;
  let daysToCheck;
  let insertData;
  for (let i = 0; i < dateListValues.length; i++) {
    insertData = dateListValues[i];
    fullName = insertData[0];
    switch (fullName) {
      case personalID:
        insertData[0] = i;
        itemType = insertData[1];
        itemAttestationDate = new Date(insertData[7]);
        daysToCheck = (itemAttestationDate - toDay) / msToDays;   // вычисляем оставшиеся дни
        if (daysToCheck > 90) {
          other = insertToArray(other, insertData, itemType, daysToCheck);     // если до срока более 90 дней вставляем в Остальные
        } else if (daysToCheck > 30) {
          near = insertToArray(near, insertData, itemType, daysToCheck);       // если до срока более 30 дней вставляем в Осталось до 90 дней
        } else if (daysToCheck > 0) {
          nearest = insertToArray(nearest, insertData, itemType, daysToCheck); // если до срока более 0 дней вставляем в Осталось до месяца
        } else {
          daysToCheck = "ПРОСРОЧЕН";
          ended = insertToArray(ended, insertData, itemType, daysToCheck);     // если срок прошел вставляем в ПРОСРОЧЕНО
        };
        break;
      case "":
        if (add.length < 31) { add.push([i, "", "", "", "", "", "", "", ""]) };
        break;
    };
  };
  result = [ended, nearest, near, other, add]

  return result;
};


function exportValues() {
  // экспорт данных из персонального списка в лист дат проверок
  let dateListRange = dateList.getRange(3, 6, dateList.getLastRow() - 2, 6);
  let dateListArray = dateListRange.getValues();
  let personalListValues = personalList.getRange(2, 1, personalList.getLastRow() - 5, 6).getValues();
  let nameID = personalListValues[0][1];
  let personalListArray = personalListValues.slice(4);
  let dataStr;
  for (let i = 0; i < personalListArray.length; i++) {
    dataStr = personalListArray[i];
    idx = dataStr[0];
    switch (idx) {
      case "":
        break;
      default:
        if (dataStr[1] == "" || dataStr[2] == "" || dataStr[4] == "" || dataStr[5] == "") {
          dateListArray[idx] = ["", "", "", "", "", ""];
        } else {
          dataStr[0] = nameID;
          dateListArray[idx] = dataStr;
        }
    }
  }
  dateListRange.clearContent();
  dateListRange = dateList.getRange(3, 6, dateListArray.length, 6);
  dateListRange.setValues(dateListArray);

  importValues();

  personalList.getRange(4, 11).setValue('Выполнить?');
}
// */
