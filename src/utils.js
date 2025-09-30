export const pageTitle = (...args) => {
  const title = args.join(" - ");
  document.title = title;
};

export const formatDateToFrench = (dateString) => {
  if (!dateString) return;
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // timeZoneName: "short",
  };
  return new Intl.DateTimeFormat("fr-FR", options).format(date);
};

export const shortenFileName = (fileName, maxLen = 40) => {
  const extension = fileName.split(".").pop();
  const nameWithoutExt = fileName.substring(
    0,
    fileName.length - extension.length - 1
  );

  if (fileName.length <= maxLen) {
    return fileName;
  }

  const sliceLen = (maxLen - 4 - extension.length - 1) / 2; // -4 for 4 chars, -1 for the ellipsis

  if (sliceLen < 1) {
    return fileName.slice(0, maxLen);
  }

  return `${nameWithoutExt.slice(0, sliceLen)}...${nameWithoutExt.slice(
    -sliceLen
  )}.${extension}`;
};
export function hasPriority(slide) {
  const jsonString = slide.display_times;
  if (jsonString === 'null') return false;
  if (!jsonString) return false;
  const timeRanges = JSON.parse(jsonString);
  for (const range of timeRanges) {
    if (range.priority) {
      return true;
    }
  }
  return false;
};
export function isAlways(slide) {
  const jsonString = slide.display_times;
  if (jsonString === 'null') return false;
  if (!jsonString) return false;
  const timeRanges = JSON.parse(jsonString);
  for (const range of timeRanges) {
    if (range.always) {
      return true;
    }
  }
  return false;
};
export function isInTimeRange(slide) {
  const jsonString = slide.display_times;
  if (jsonString === 'null') return true;
  if (!jsonString) return true;
  const timeRanges = JSON.parse(jsonString);
  if (!timeRanges) return true;
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const currentWeekNumber = getWeekNumber(now);
  const isWeekEven = currentWeekNumber % 2 === 0;

  console.log(`Slide id: ${slide.id}`);
  console.log(`Current day: ${currentDay}`);
  console.log(`Current time in HHMM format: ${currentTime}`);
  console.log(`Current week number: ${currentWeekNumber} (Even: ${isWeekEven})`);

  for (const range of timeRanges) {
    console.log('⏱️ Checking range:', range);
    if (range.weekNumberIs) {
      console.log(`📆 Checking week number: Requested : ${range.weekNumberIs}, Current: ${currentWeekNumber} (Even: ${isWeekEven})`);

      if (range.weekNumberIs === 'even' && !isWeekEven) {
        console.log(`❌ Week number is not even.`);
        break;
      }
      if (range.weekNumberIs === 'odd' && isWeekEven) {
        console.log(`❌ Week number is not odd.`);
        break;
      }
      if (!isNaN(range.weekNumberIs) && (Number(range.weekNumberIs) !== currentWeekNumber)) {
        console.log(`❌ Week number does not match. Expected: ${range.weekNumberIs}, Current: ${currentWeekNumber}`);
        break;
      }
      console.log(`✅ Week number is ok, continuing`);
    }

    console.log(`⌚ Checking time range: Start - ${range.start}, End - ${range.end}, Days - ${range.days ? range.days.join(', ') : 'all days'}`);

    if (range.days && !range.days.includes(currentDay)) {
      console.log(`❌ Current day is not included in the specified days for this range.`);
      break
    }


    const startTime = parseInt(range.start?.replace(':', ''), 10);
    const endTime = parseInt(range.end?.replace(':', ''), 10);

    if (!startTime && !endTime) continue;
    console.log(`🏳️ Converted start time: ${startTime}`);
    console.log(`🚩 Converted end time: ${endTime}`);

    if (currentTime >= startTime && currentTime <= endTime) {
      console.log('✅ Current time is within this range.');
      return true;
    } else {
      console.log('❌ Current time is not within this range.');
    }
  }

  console.log(`Final result: False - Time is not within any of the ranges`);
  return false;
}

function getWeekNumber(date) {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const millisecsInDay = 86400000;
  return Math.ceil(((date - oneJan) / millisecsInDay + oneJan.getDay() + 1) / 7);
}
