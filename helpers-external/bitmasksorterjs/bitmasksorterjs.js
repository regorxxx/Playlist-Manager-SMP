'use strict';
//27/10/23

(function (
  indexFactory,
  moduleDFactory,
  moduleEFactory,
  moduleFFactory,
  moduleCFactory

) {
  var moduleCExports = moduleCFactory();
  var moduleFExports = moduleFFactory();
  var moduleEExports = moduleEFactory(moduleCExports);
  var moduleDExports = moduleDFactory(moduleCExports);
  return module.exports = indexFactory(
    moduleCExports,
    moduleDExports,
    moduleEExports,
    moduleFExports
  );
})(
  function indexFactory(moduleC, moduleD, moduleE, moduleF) {
    var arrayCopy = moduleC.arrayCopy,
      sortInt = moduleD.sortInt,
      sortNumber = moduleE.sortNumber,
      pCountSortInt = moduleF.pCountSortInt;

    return {
      // arrayCopy: arrayCopy,
      sortInt: sortInt,
      sortNumber: sortNumber,
      // pCountSortInt: pCountSortInt,
    };
  },
  function moduleDFactory(moduleC) {
    var arrayCopy = moduleC.arrayCopy,
      getSections = moduleC.getSections,
      getMaskRangeBits = moduleC.getMaskRangeBits,
      partitionReverseNotStableUpperBit =
        moduleC.partitionReverseNotStableUpperBit,
      getMaskAsArray = moduleC.getMaskAsArray;
    function calculateMaskInt(array, start, endP1) {
      let mask = 0x00000000;
      let inv_mask = 0x00000000;
      for (let i = start; i < endP1; i++) {
        let ei = array[i];
        mask = mask | ei;
        inv_mask = inv_mask | ~ei;
      }
      return mask & inv_mask;
    }

    function partitionStableInt(array, start, endP1, mask, aux) {
      let left = start;
      let right = 0;
      for (let i = start; i < endP1; i++) {
        let element = array[i];
        if ((element & mask) === 0) {
          array[left] = element;
          left++;
        } else {
          aux[right] = element;
          right++;
        }
      }
      arrayCopy(aux, 0, array, left, right);
      return left;
    }

    function partitionStableLastBitsInt(
      array,
      start,
      endP1,
      mask,
      dRange,
      aux
    ) {
      let count = Array(dRange).fill(0);
      for (let i = start; i < endP1; i++) {
        count[array[i] & mask]++;
      }
      for (let i = 0, sum = 0; i < dRange; i++) {
        let c = count[i];
        count[i] = sum;
        sum += c;
      }
      for (let i = start; i < endP1; i++) {
        let element = array[i];
        aux[count[element & mask]++] = element;
      }
      arrayCopy(aux, 0, array, start, endP1 - start);
    }

    function partitionStableGroupBitsInt(
      array,
      start,
      endP1,
      mask,
      shiftRight,
      dRange,
      aux
    ) {
      let count = Array(dRange).fill(0);
      for (let i = start; i < endP1; i++) {
        count[(array[i] & mask) >> shiftRight]++;
      }
      for (let i = 0, sum = 0; i < dRange; i++) {
        let c = count[i];
        count[i] = sum;
        sum += c;
      }
      for (let i = start; i < endP1; i++) {
        let element = array[i];
        aux[count[(element & mask) >> shiftRight]++] = element;
      }
      arrayCopy(aux, 0, array, start, endP1 - start);
    }

    function radixSortInt(array, start, end, bList, aux) {
      let sections = getSections(bList);
      for (let index = 0; index < sections.length; index++) {
        let res = sections[index];
        let bits = res[0];
        let shift = res[1];
        let bStart = res[2];
        let mask = getMaskRangeBits(bStart, shift);
        if (bits === 1) {
          partitionStableInt(array, start, end, mask, aux);
        } else {
          let dRange = 1 << bits;
          if (shift === 0) {
            partitionStableLastBitsInt(array, start, end, mask, dRange, aux);
          } else {
            partitionStableGroupBitsInt(
              array,
              start,
              end,
              mask,
              shift,
              dRange,
              aux
            );
          }
        }
      }
    }

    function sortInt(array, start, endP1) {
      if (!start) {
        start = 0;
      }
      if (!endP1) {
        endP1 = array.length;
      }
      let n = endP1 - start;
      if (n < 2) {
        return array;
      }
      let mask = calculateMaskInt(array, start, endP1);
      let bList = getMaskAsArray(mask);
      if (bList.length === 0) {
        return array;
      }
      if (bList[0] === 31) {
        let finalLeft = partitionReverseNotStableUpperBit(array, start, endP1);
        let n1 = finalLeft - start;
        let n2 = endP1 - finalLeft;
        let bList1;
        let bList2;
        if (n1 > 1) {
          bList1 = getMaskAsArray(calculateMaskInt(array, start, finalLeft));
          if (bList1.length <= 0) {
            n1 = 0;
          }
        }
        if (n2 > 1) {
          bList2 = getMaskAsArray(calculateMaskInt(array, finalLeft, endP1));
          if (bList2.length <= 0) {
            n2 = 0;
          }
        }
        let aux = Array(Math.max(n1, n2));
        if (n1 > 0) {
          radixSortInt(array, start, finalLeft, bList1, aux);
        }
        if (n2 > 0) {
          radixSortInt(array, finalLeft, endP1, bList2, aux);
        }
      } else {
        let aux = Array(endP1 - start);
        radixSortInt(array, start, endP1, bList, aux);
      }
	  return array;
    }
    return { sortInt: sortInt };
  },
  function moduleEFactory(moduleC) {
    var arrayCopy = moduleC.arrayCopy,
      getMaskAsArray = moduleC.getMaskAsArray,
      getMaskRangeBits = moduleC.getMaskRangeBits,
      getSections = moduleC.getSections,
      partitionReverseNotStableUpperBit =
        moduleC.partitionReverseNotStableUpperBit,
      reverse = moduleC.reverse;
    function calculateMaskNumber(array, start, endP1) {
      let pMask0 = 0;
      let invMask0 = 0;
      let pMask1 = 0;
      let invMask1 = 0;
      for (let i = start; i < endP1; ++i) {
        let im2 = i * 2;
        let ei0 = array[im2];
        let ei1 = array[im2 + 1];
        pMask0 = pMask0 | ei0;
        invMask0 = invMask0 | ~ei0;
        pMask1 = pMask1 | ei1;
        invMask1 = invMask1 | ~ei1;
      }
      return [pMask0 & invMask0, pMask1 & invMask1];
    }

    function getMaskAsArrayNumber(masks) {
      return [getMaskAsArray(masks[0]), getMaskAsArray(masks[1])];
    }

    function partitionStableNumber(
      arrayI32,
      arrayF64,
      start,
      endP1,
      mask,
      elementIndex,
      auxF64
    ) {
      let left = start;
      let right = 0;
      for (let i = start; i < endP1; i++) {
        let element = arrayF64[i];
        if ((arrayI32[i * 2 + elementIndex] & mask) === 0) {
          arrayF64[left] = element;
          left++;
        } else {
          auxF64[right] = element;
          right++;
        }
      }
      arrayCopy(auxF64, 0, arrayF64, left, right);
      return left;
    }

    function partitionStableLastBitsNumber(
      arrayI32,
      arrayF64,
      start,
      endP1,
      mask,
      elementIndex,
      dRange,
      auxF64
    ) {
      let count = Array(dRange).fill(0);
      for (let i = start; i < endP1; ++i) {
        count[arrayI32[i * 2 + elementIndex] & mask]++;
      }
      for (let i = 0, sum = 0; i < dRange; i++) {
        let c = count[i];
        count[i] = sum;
        sum += c;
      }
      for (let i = start; i < endP1; ++i) {
        let element = arrayF64[i];
        let elementShiftMasked = arrayI32[i * 2 + elementIndex] & mask;
        let index = count[elementShiftMasked];
        count[elementShiftMasked]++;
        auxF64[index] = element;
      }
      arrayCopy(auxF64, 0, arrayF64, start, endP1 - start);
    }

    function partitionStableGroupBitsNumber(
      arrayI32,
      arrayF64,
      start,
      endP1,
      mask,
      elementIndex,
      shiftRight,
      dRange,
      auxF64
    ) {
      let count = Array(dRange).fill(0);
      for (let i = start; i < endP1; ++i) {
        count[(arrayI32[i * 2 + elementIndex] & mask) >>> shiftRight]++;
      }
      for (let i = 0, sum = 0; i < dRange; ++i) {
        let c = count[i];
        count[i] = sum;
        sum += c;
      }
      for (let i = start; i < endP1; ++i) {
        let element = arrayF64[i];
        let elementShiftMasked =
          (arrayI32[i * 2 + elementIndex] & mask) >>> shiftRight;
        let index = count[elementShiftMasked];
        count[elementShiftMasked]++;
        auxF64[index] = element;
      }
      arrayCopy(auxF64, 0, arrayF64, start, endP1 - start);
    }

    function radixSortNumber(arrayI32, arrayF64, start, endP1, bList, auxF64) {
      let elementIndex = 0;
      let sections0 = getSections(bList[elementIndex]);
      for (let index = 0; index < sections0.length; index++) {
        let res = sections0[index];
        let bits = res[0];
        let shift = res[1];
        let bStart = res[2];
        let mask = getMaskRangeBits(bStart, shift);
        if (bits === 1) {
          partitionStableNumber(
            arrayI32,
            arrayF64,
            start,
            endP1,
            mask,
            elementIndex,
            auxF64
          );
        } else {
          let dRange = 1 << bits;
          if (shift === 0) {
            partitionStableLastBitsNumber(
              arrayI32,
              arrayF64,
              start,
              endP1,
              mask,
              elementIndex,
              dRange,
              auxF64
            );
          } else {
            partitionStableGroupBitsNumber(
              arrayI32,
              arrayF64,
              start,
              endP1,
              mask,
              elementIndex,
              shift,
              dRange,
              auxF64
            );
          }
        }
      }
      elementIndex = 1;
      let sections1 = getSections(bList[elementIndex]);
      for (let index = 0; index < sections1.length; index++) {
        let res = sections1[index];
        let bits = res[0];
        let shift = res[1];
        let bStart = res[2];
        let mask = getMaskRangeBits(bStart, shift);
        if (bits === 1) {
          partitionStableNumber(
            arrayI32,
            arrayF64,
            start,
            endP1,
            mask,
            elementIndex,
            auxF64
          );
        } else {
          let dRange = 1 << bits;
          if (shift === 0) {
            partitionStableLastBitsNumber(
              arrayI32,
              arrayF64,
              start,
              endP1,
              mask,
              elementIndex,
              dRange,
              auxF64
            );
          } else {
            partitionStableGroupBitsNumber(
              arrayI32,
              arrayF64,
              start,
              endP1,
              mask,
              elementIndex,
              shift,
              dRange,
              auxF64
            );
          }
        }
      }
    }

    function sortNumber(array, start, endP1) {
      if (!start) {
        start = 0;
      }
      if (!endP1) {
        endP1 = array.length;
      }
      let n = endP1 - start;
      if (n < 2) {
        return array;
      }
      let arrayFloat64 =
        array instanceof Float64Array ? array : new Float64Array(array);
      const buffer = arrayFloat64.buffer;
      let arrayInt32 = new Int32Array(buffer);

      let mask = calculateMaskNumber(arrayInt32, start, endP1);
      let bList = getMaskAsArrayNumber(mask);
      if (bList[0].length === 0 && bList[1].length === 0) {
        return array;
      }
      if (bList[1][0] === 31) {
        let finalLeft = partitionReverseNotStableUpperBit(
          arrayFloat64,
          start,
          endP1
        );
        let n1 = finalLeft - start;
        let n2 = endP1 - finalLeft;
        let bList1;
        let bList2;
        if (n1 > 1) {
          bList1 = getMaskAsArrayNumber(
            calculateMaskNumber(arrayInt32, start, finalLeft)
          );
          if (bList1[0].length === 0 && bList1[1].length === 0) {
            n1 = 0;
          }
        }
        if (n2 > 1) {
          bList2 = getMaskAsArrayNumber(
            calculateMaskNumber(arrayInt32, finalLeft, endP1)
          );
          if (bList2[0].length === 0 && bList2[1].length === 0) {
            n2 = 0;
          }
        }
        let auxFloat64 = new Float64Array(Math.max(n1, n2));
        if (!(bList1[0].length === 0 && bList1[1].length === 0)) {
          radixSortNumber(
            arrayInt32,
            arrayFloat64,
            start,
            finalLeft,
            bList1,
            auxFloat64
          );
          reverse(arrayFloat64, start, finalLeft);
        }
        if (!(bList2[0].length === 0 && bList2[1].length === 0)) {
          radixSortNumber(
            arrayInt32,
            arrayFloat64,
            finalLeft,
            endP1,
            bList2,
            auxFloat64
          );
        }
      } else {
        let auxFloat64 = new Float64Array(endP1 - start);
        radixSortNumber(
          arrayInt32,
          arrayFloat64,
          start,
          endP1,
          bList,
          auxFloat64
        );
        if (arrayFloat64[0] < 0) {
          reverse(arrayFloat64, start, endP1);
        }
      }

      arrayCopy(arrayFloat64, 0, array, start, endP1 - start);
	  return array;
    }
    return { sortNumber: sortNumber };
  },
  function moduleFFactory() {
    function pCountSortInt(array, start, endP1, min, max) {
      if (!start) {
        start = 0;
      }
      if (!endP1) {
        endP1 = array.length;
      }
      let n = endP1 - start;
      if (n < 2) {
        return;
      }
      if (!min || !max) {
        min = array[start];
        max = array[start];
        for (let i = start + 1; i < endP1; i++) {
          let value = array[i];
          if (value < min) {
            min = value;
          }
          if (value > max) {
            max = value;
          }
        }
      }
      let range = max - min + 1;
      if (range > 2 ** 24) {
        console.error(
          "Pigeonhole Count sort should be used for number range <= 2**24, for optimal performance: range <= 2**20"
        );
      }
      let count = new Array(range).fill(0);
      for (let i = start; i < endP1; i++) {
        count[array[i] - min]++;
      }
      let i = start;
      let j = min;
      for (; j <= max; j++) {
        let cMax = count[j - min];
        if (cMax > 0) {
          for (let c = 0; c < cMax; c++) {
            array[i] = j;
            i++;
          }
          if (i === endP1) {
            break;
          }
        }
      }
    }
    return { pCountSortInt: pCountSortInt };
  },
  function moduleCFactory() {
    function arrayCopy(src, srcPos, dst, dstPos, length) {
      while (length--) dst[dstPos++] = src[srcPos++];
      return dst;
    }

    function swap(array, left, right) {
      let aux = array[left];
      array[left] = array[right];
      array[right] = aux;
    }

    function reverse(array, start, endP1) {
      let length = endP1 - start;
      let ld2 = length / 2;
      let end = endP1 - 1;
      for (let i = 0; i < ld2; ++i) {
        swap(array, start + i, end - i);
      }
    }

    function partitionReverseNotStableUpperBit(array, start, endP1) {
      let left = start;
      let right = endP1 - 1;

      while (left <= right) {
        let element = array[left];
        if (element >= 0) {
          while (left <= right) {
            element = array[right];
            if (element >= 0) {
              right--;
            } else {
              swap(array, left, right);
              left++;
              right--;
              break;
            }
          }
        } else {
          left++;
        }
      }
      return left;
    }

    const MAX_BITS_RADIX_SORT = 11;

    function reverseListGet(bList, index) {
      return bList[bList.length - 1 - index];
    }

    function getSections(bList) {
      if (!bList || bList.length === 0) {
        return [];
      }
      let maxBitsDigit = MAX_BITS_RADIX_SORT;
      let sections = [];
      let b = 0;
      let shift = reverseListGet(bList, b);
      let bits = 1;
      b++;
      while (b < bList.length) {
        let bitIndex = reverseListGet(bList, b);
        if (bitIndex <= shift + maxBitsDigit - 1) {
          bits = bitIndex - shift + 1;
        } else {
          sections.push([bits, shift, shift + bits - 1]);
          shift = bitIndex;
          bits = 1;
        }
        b++;
      }
      sections.push([bits, shift, shift + bits - 1]);
      return sections;
    }

    function getMaskAsArray(mask) {
      let res = [];
      for (let i = 31; i >= 0; i--) {
        if (((mask >> i) & 1) === 1) {
          res.push(i);
        }
      }
      return res;
    }

    function getMaskRangeBits(bStart, bEnd) {
      return ((1 << (bStart + 1 - bEnd)) - 1) << bEnd;
    }
    return {
      arrayCopy: arrayCopy,
      swap: swap,
      reverse: reverse,
      partitionReverseNotStableUpperBit: partitionReverseNotStableUpperBit,
      getSections: getSections,
      getMaskAsArray: getMaskAsArray,
      getMaskRangeBits: getMaskRangeBits,
    };
  }
);