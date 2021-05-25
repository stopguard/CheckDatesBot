// Структура данных находится в гугл-таблице. Ссылка приложена в описании репозитория
// Все указанные здесь переменные и функции находятся в области видимости бота, находящегося в файле BOT.gs

const ss = SpreadsheetApp.getActiveSpreadsheet()                        // получаем доступ  к активной таблице
const personalList = ss.getSheetByName('Персональный список');          //                  к листу с персональным списком
const docsList = ss.getSheetByName('Удостоверения');                    //                  к листу удостоверений
const instrList = ss.getSheetByName('Инструмент');                      //                  к листу инструмента
const msToDays = 86400000                                               // переменная для перевода миллисекунд в дни

function onEdit() {
  // исполняется при изменении любой ячейки в таблице
  let sheet = ss.getActiveSheet();
  let actSheetName = sheet.getName()
  let active = ss.getActiveRange();
  let index = active.getRowIndex();
  let cellcol = active.getColumnIndex();

  if (actSheetName === 'Удостоверения' && (cellcol % 4) === 0 && index > 4) {
    // Автозаполнение даты проверки знаний при изменении даты обновления удостоверения

    sheet.getRange(index, cellcol + 2).setValue(active.getValue());
  } else if (actSheetName === 'Персональный список' && (cellcol === 2 && index === 2) || (sheet.getRange(3, 8).getValue() == 'Да')) {
    // Тянем данные о сотруднике при выборе сотрудника на листе персонального списка или при запросе обновления
    personalList.getRange(3, 8).setValue('В процессе')
    importValues();
  } else if (actSheetName === 'Персональный список' && (sheet.getRange(4, 8).getValue() == 'Да')) {
    // Заливаем обновлённые данные в сводные таблицы
    personalList.getRange(4, 8).setValue('В процессе')
    exportValues();
  }
}

function importValues() {
  // импорт данных из удостоверений и инструмента в персональный список

  let personalID = personalList.getRange(2, 2).getValue().split(' | ');                                             // разбиваем строку запроса на айди и имя
  const docsListValues = docsList.getRange(1, 1, docsList.getLastRow(), docsList.getLastColumn()).getValues();      // получаем значения с листа удостоверений
  const instrListValues = instrList.getRange(1, 1, instrList.getLastRow(), instrList.getLastColumn()).getValues();  //                           инструмента
  const toDay = personalList.getRange(4, 5).getValue();                                                             // забираем из ячейки текущую дату

  // добавляем к массиву идентификации номер строки с запрошенным пользователем
  personalID.push(docsListValues.findIndex(item => item[0] == personalID[1]))

  let result = arrayGen(docsListValues, instrListValues, personalID, toDay)

  // ====================ОТПРАВКА ДАННЫХ В ТАБЛИЦУ====================
  // выводим персональные данные на лист
  personalList.getRange(4, 2, 1, 3).setValues([[personalID[0], personalID[1], personalID[2] + 1]]);

  // Чистим тело таблицы от данных
  let personalListRange = personalList.getRange(6, 1, personalList.getLastRow(), 7)
  personalListRange.setValue('')
  let valuesList = []  // заготовка для списка вывода

  for (let i = 0; i < result.length; i++) {
    valuesList = valuesList.concat(result[i])   // объединяем списки из результата
  }
  personalListRange = personalList.getRange(6, 1, valuesList.length, 6)  // доступ к диапазону
  personalListRange.setValues(valuesList)                               // заливка значений в таблицу

  personalList.getRange(3, 8).setValue('Выполнить?')

  //Browser.msgBox(JSON.stringify(valuesList))
}

function arrayGen(docsListValues, instrListValues, personalID, toDay) {
  // создаём заготовку для отправки данных боту или на вывод в лист "Персональный список"
  let result = [[["", "Просрочены:", "", "", "", ""]],
  [["", "Осталось до месяца:", "", "", "", ""]],
  [["", "Остальные:", "", "", "", ""]],
  [["", "", "", "", "", ""],
  ["", "Не выдавались или возвращены:", "", "", "", ""]]];

  // Проход по удостоверениям сотрудника с добавлением в список в соответствии со статусом
  for (let i = 3; i < docsListValues[0].length; i += 4) {
    let marker = 0;               /* идентификатор куда добавлять данные. 0 - просрочены,
                                                                          1 - осталось меньше месяца, 
                                                                          2 - всё в порядке, 
                                                                          3 - отсутствует */
    if (docsListValues[2][i] == "") {
      // игнорируем данные без сроков действия
    } else if (docsListValues[personalID[2]][i] == "") {
      result[3].push([i + 1, docsListValues[0][i] + ' (Удостоверение)', "", "", "", "Удостоверение"]);   // если отсутствует дата проверки знаний, добавляем в список не выданных удостоверений
      if (docsListValues[2][i + 2] != "") {
        result[3].push([i + 3, docsListValues[0][i] + ' (Аттестация)', "", "", "", "Удостоверение"]);    // если отсутствует дата проверки знаний, добавляем в список не выданных аттестаций
      };
    } else {                                                                // если дата проверки знаний имеется
      // создаём переменные хранящие даты проверки знаний и завершения действия, и переменную обратного отсчёта количества дней
      let checkDate = new Date(docsListValues[personalID[2]][i]);
      let limitDate = new Date(docsListValues[personalID[2]][i]).setMonth(checkDate.getMonth() + docsListValues[2][i]);
      let daysToCheck = '';

      if (limitDate > toDay) {                      // если лимит ещё не вышел
        daysToCheck = (limitDate - toDay) / msToDays; // вычисляем оставшиеся дни
        if (daysToCheck > 30) {                     // если осталось больше 30 то всё в порядке
          marker = 2;
        } else {                                  // иначе осталось меньше месяца
          marker = 1;
        };
      } else {                                  // если лимит вышел
        daysToCheck = 'ПРОСРОЧЕН';                // отмечаем, что проверка просрочена
        marker = 0;
      };

      // оформляем даты проверки и лимита и добавляем в результат в соответствии с маркером
      checkDate = Utilities.formatDate(new Date(checkDate), "GMT+5", "dd.MM.yyyy")
      limitDate = Utilities.formatDate(new Date(limitDate), "GMT+5", "dd.MM.yyyy")
      result[marker].push([i + 1, docsListValues[0][i] + ' (Удостоверение)', checkDate, limitDate, daysToCheck, 'Удостоверение']);

      // проверяем требуется ли аттестация
      if (docsListValues[2][i + 2] != "") {
        // если требуется получаем даты проверки знаний и лимита
        checkDate = new Date(docsListValues[personalID[2]][i + 2]);
        limitDate = new Date(docsListValues[personalID[2]][i + 2]).setMonth(checkDate.getMonth() + docsListValues[2][i + 2]);

        if (limitDate > toDay) {                      // если лимит ещё не вышел
          daysToCheck = (limitDate - toDay) / msToDays; // вычисляем оставшиеся дни
          if (daysToCheck > 30) {                     // если осталось больше 30 то всё в порядке
            marker = 2;
          } else {                                  // иначе осталось меньше месяца
            marker = 1;
          };
        } else {                                  // если лимит вышел
          daysToCheck = 'ПРОСРОЧЕН';                // отмечаем, что проверка просрочена
          marker = 0;
        };

        // оформляем даты проверки и лимита и добавляем в результат в соответствии с маркером
        checkDate = Utilities.formatDate(new Date(checkDate), "GMT+5", "dd.MM.yyyy")
        limitDate = Utilities.formatDate(new Date(limitDate), "GMT+5", "dd.MM.yyyy")
        result[marker].push([i + 3, docsListValues[0][i] + ' (Аттестация)', checkDate, limitDate, daysToCheck, 'Удостоверение']);
      };
    };
  }

  // Проход по инструменту сотрудника с добавлением в список в соответствии со статусом
  for (let i = 3; i < instrListValues[0].length; i += 2) {
    let marker = 0;               /* идентификатор куда добавлять данные. 0 - просрочены,
                                                                          1 - осталось меньше месяца, 
                                                                          2 - всё в порядке, 
                                                                          3 - отсутствует */
    if (instrListValues[2][i] == "") {
      // игнорируем данные без сроков действия
    } else if (instrListValues[personalID[2]][i] == "") {
      result[3].push([i + 1001, instrListValues[0][i], "", "", "", "Инструмент"]);     // если отсутствует дата проверки знаний добавляем в список не выданных
    } else {                                                                // если дата проверки знаний имеется
      // создаём переменные хранящие даты проверки знаний и завершения действия, и переменную обратного отсчёта количества дней
      let checkDate = new Date(instrListValues[personalID[2]][i]);
      let limitDate = new Date(instrListValues[personalID[2]][i]).setMonth(checkDate.getMonth() + instrListValues[2][i]);
      let daysToCheck = '';
      if (limitDate > toDay) {                      // если лимит ещё не вышел
        daysToCheck = (limitDate - toDay) / msToDays; // вычисляем оставшиеся дни
        if (daysToCheck > 30) {                     // если осталось больше 30 то всё в порядке
          marker = 2;
        } else {                                  // иначе осталось меньше месяца
          marker = 1;
        };
      } else {                                  // если лимит вышел
        daysToCheck = 'ПРОСРОЧЕН';                // отмечаем, что проверка просрочена
        marker = 0;
      };

      // оформляем даты проверки и лимита и добавляем в результат в соответствии с маркером
      checkDate = Utilities.formatDate(new Date(checkDate), "GMT+5", "dd.MM.yyyy")
      limitDate = Utilities.formatDate(new Date(limitDate), "GMT+5", "dd.MM.yyyy")
      result[marker].push([i + 1001, instrListValues[0][i] + ' (Инструмент)', checkDate, limitDate, daysToCheck, 'Инструмент']);
    };
  }

  return result;
}


function exportValues() {
  // экспорт данных из персонального списка в удостоверения и инструмент

  let ss = SpreadsheetApp.getActiveSpreadsheet()                        // получаем доступ  к активной таблице
  let personalList = ss.getSheetByName('Персональный список');          //                  к листу с персональным списком
  let docsList = ss.getSheetByName('Удостоверения');                    //                  к листу удостоверений
  let instrList = ss.getSheetByName('Инструмент');                      //                  к листу инструмента
  let rowIdx = personalList.getRange(4, 4).getValue()
  let maxDocs = 0;  // максимальный номер столба документов
  let maxInstr = 0; // максимальный номер столба инструмента
  let personalValues = personalList.getRange(6, 1, personalList.getLastRow() - 5, 6).getValues()  // забираем данные из первого столбца работника
  for (let i = 0; i < personalValues.length; i++) {
    // ищем максимальные номера столбов
    if (+personalValues[i][0] < 1000 && (+personalValues[i][0]) > maxDocs) {
      maxDocs = +personalValues[i][0]
    } else if ((+personalValues[i][0] - 1000) > maxInstr) {
      maxInstr = +personalValues[i][0] - 1000
    }
  }
  if (maxDocs % 4 == 0) {
    maxDocs += 2          // растягиваем столбец доков до аттестации
  }

  // создаём массивы для вставки в таблицы
  let docsArray = new Array(maxDocs - 3)
  let instrArray = new Array(maxInstr - 3)
  docsArray.fill('')
  instrArray.fill('')

  // заполняем массивы для вставки в таблицы значениями
  for (let i = 0; i < personalValues.length; i++) {
    let column = +personalValues[i][0] - 4
    if (personalValues[i][2] != "") {
      if (column >= 1000) {
        column -= 1000
        instrArray[column] = Utilities.formatDate(new Date(personalValues[i][2]), "GMT+5", "dd.MM.yyyy")
      } else if (column >= 0) {
        docsArray[column] = new Date(personalValues[i][2])
      }
    }
  }

  // проверяем чтобы не обнаружилось дат аттестации меньших чем дата обновления удостоверения и форматируем даты в текст
  for (let i = 0; i < docsArray.length; i += 4) {
    if (docsArray[i] > docsArray[i + 2]) {
      docsArray[i + 2] = new Date(docsArray[i])
    } else {
      docsArray[i + 2] = new Date(docsArray[i + 2])
    }
    if (docsArray[i] == '') {
      docsArray[i + 2] = ''
    } else {
      docsArray[i] = Utilities.formatDate(new Date(docsArray[i]), "GMT+5", "dd.MM.yyyy")
      docsArray[i + 2] = Utilities.formatDate(new Date(docsArray[i + 2]), "GMT+5", "dd.MM.yyyy")
    }
  }

  // заливаем значения в таблицу
  docsList.getRange(rowIdx, 4, 1, docsArray.length).setValues([docsArray])
  instrList.getRange(rowIdx, 4, 1, instrArray.length).setValues([instrArray])

  // Browser.msgBox(JSON.stringify(docsArray + '\n' + instrArray))
  personalList.getRange(4, 8).setValue('Выполнить?')
  importValues()
}
