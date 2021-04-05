/**
 * Generate the array containing the pages based on the current page
 * eg. page: 1 maxPages: 1 => [1]
 * eg. page: 2 maxPages: 3 => [1,2,3]
 * eg. page: 1 maxPages: 8 => [1,2,3,4,5]
 * eg. page: 4 maxPages: 8 => [2,3,4,5,6]
 * eg. page: 6 maxPages: 8 => [4,5,6,7,8]
 * @param page number current page
 * @param maxPages number
 * @returns number[]
 */
export const indexToRender = (page: number, maxPages: number) => {
  const indexToReturn = [];
  let count = 0;
  if (page > 2 && page < maxPages - 2) {
    const tmpIndex = page - 2;
    while (count < 5) {
      indexToReturn.push(tmpIndex + count);
      count++;
    }
  } else if (page <= 2) {
    const min = maxPages <= 5 ? maxPages : 5;
    while (count < min) {
      indexToReturn.push(1 + count);
      count++;
    }
  } else {
    if (maxPages <= 5) {
      const tmpFirstIndex = maxPages - (maxPages - 1);
      while (count < maxPages) {
        indexToReturn.push(tmpFirstIndex + count);
        count++;
      }
    } else {
      const tmpFirstIndex = maxPages - 4;
      while (count < 5) {
        indexToReturn.push(tmpFirstIndex + count);
        count++;
      }
    }
  }
  return indexToReturn;
};

/**
 * Creates an array of numbers from 1 to n
 * maxPages 10 -> return [1,2,...10]
 */
export const createIndexesArray = (maxPages: number) => {
  const indexes = [];
  for (let i = 1; i <= maxPages; i++) {
    indexes.push(i);
  }
  return indexes;
};
