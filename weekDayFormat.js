function weekDayFormat(dayInt){

  if(dayInt == 0){
    return "Sunday";
  }else if(dayInt == 1){
    return "Monday";
  }else if(dayInt == 2){
    return "Tuesday";
  }else if(dayInt == 3){
    return "Wednesday";
  }else if(dayInt == 4){
    return "Thursday";
  }else if(dayInt == 5){
    return "Friday";
  }else if(dayInt == 6){
    return "Saturday";
  }

  return null;

}

function currentWeekDay(){
  return weekDayFormat(new Date().getDay());
}

module.exports = weekDayFormat;