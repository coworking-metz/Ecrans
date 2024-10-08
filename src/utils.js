export const pageTitle = (...args) => {
  const title = args.join(" - ");
  document.title = title;
};

export const formatDateToFrench = (dateString) => {
  if(!dateString) return;
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


export function isInTimeRange(jsonString) {
  if(!jsonString) return true;
  const timeRanges = JSON.parse(jsonString);
  if(!timeRanges) return true;
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert current time to HHMM format for easier comparison

  console.log(`Current day: ${currentDay}`);
  console.log(`Current time in HHMM format: ${currentTime}`);

  const result = timeRanges.some(range => {
      console.log(`Checking time range: Start - ${range.start}, End - ${range.end}, Days - ${range.days ? range.days.join(', ') : 'all days'}`);

      if (!range.days || range.days.includes(currentDay)) {
          const startTime = parseInt(range.start.replace(':', ''), 10);
          const endTime = parseInt(range.end.replace(':', ''), 10);

          console.log(`Converted start time: ${startTime}`);
          console.log(`Converted end time: ${endTime}`);

          if (currentTime >= startTime && currentTime <= endTime) {
              console.log('Current time is within this range.');
              return true;
          } else {
              console.log('Current time is not within this range.');
          }
      } else {
          console.log(`Current day is not included in the specified days for this range.`);
      }
      return false;
  });

  console.log(`Final result: ${result ? 'True - Time is within one of the ranges' : 'False - Time is not within any of the ranges'}`);
  return result;
}
