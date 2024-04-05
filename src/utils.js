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
