// Структура данных находится в гугл-таблице. Ссылка приложена в описании репозитория
// Все указанные здесь переменные и функции находятся в области видимости бота, находящегося в файле b_BOT.gs

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
