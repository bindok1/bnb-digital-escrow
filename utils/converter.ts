export const toBigInt = (value: number | string | bigint): bigint => {
    return BigInt(value);
};

export const convertToBigInt = (data: any): any => {
    if (typeof data === 'number') return BigInt(data);
    if (Array.isArray(data)) return data.map(convertToBigInt);
    return data;
};


/**
 * Convert string to hex format with 0x prefix
 * @param str string to convert
 * @returns hex string with 0x prefix
 */
export function stringToHex(str: string): `0x${string}` {
    let hex = '0x';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16);
    }
    return hex as `0x${string}`;
  }
  
  /**
   * Convert hex string back to normal string
   * @param hex hex string with 0x prefix
   * @returns decoded string
   */
  export function hexToString(hex: string): string {
    let str = '';
    for (let i = 2; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }