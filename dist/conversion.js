// async function TransformToJson(payload) {
//   const transformData = payload?.metaData;
//   const payloadDataRows = payload?.rows;
//   //Added Dynamic Keys Iteration Function
//   let payloadData = [];
//   payloadDataRows?.forEach(function (item, i) {
//     var obj = {};
//     Object.values(transformData).map((tfd, tdfIndex) => {
//       obj[tfd["name"]] = item[tdfIndex];
//       payloadData.push(obj);
//     });
//   });
//   const payloadDataResult = [...new Set(payloadData)];
//   return payloadDataResult;
// }
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Updated fro Null Handling
 * @param {*} payload
 * @returns
 */
function TransformToJson(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const transformData = payload === null || payload === void 0 ? void 0 : payload.metaData;
        const payloadDataRows = payload === null || payload === void 0 ? void 0 : payload.rows;
        // Added Dynamic Keys Iteration Function
        const payloadData = [];
        payloadDataRows === null || payloadDataRows === void 0 ? void 0 : payloadDataRows.forEach(function (item, i) {
            const obj = {};
            Object.values(transformData).map((tfd, tdfIndex) => {
                const value = item[tdfIndex];
                // Check if the value is null or "null", then replace it with an empty string
                // obj[tfd["name"]] = value === null || value === "null" ? "" : value;
                obj[tfd["name"]] = value === null || value === "null" ? "" : value;
            });
            payloadData.push(obj);
        });
        const payloadDataResult = [...new Set(payloadData)];
        return payloadDataResult;
    });
}
function TransObjKeysToCamelCase(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => TransObjKeysToCamelCase(item));
    }
    const camelCasedObj = {};
    for (const key in obj) {
        try {
            if (obj.hasOwnProperty(key)) {
                const lowerCaseKey = key.toLowerCase();
                const camelCaseKey = lowerCaseKey.replace(/_([A-Za-z])/g, (_, letter) => letter.toUpperCase());
                if (typeof obj[key] === "object" && obj[key] && obj[key].toISOString) {
                    // If the value is a Date object, convert it to an ISO string
                    camelCasedObj[camelCaseKey] = obj[key].toISOString();
                }
                else {
                    camelCasedObj[camelCaseKey] = TransObjKeysToCamelCase(obj[key]);
                }
            }
        }
        catch (err) {
            console.log("error: ", err);
        }
    }
    return camelCasedObj;
}
function toCamelCase(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => toCamelCase(item));
    }
    if (obj instanceof Date) {
        return obj; // Return the date object as is
    }
    const camelCasedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const lowerCaseKey = key.toLowerCase();
            const camelCaseKey = lowerCaseKey.replace(/_([A-Za-z])/g, (_, letter) => letter.toUpperCase());
            camelCasedObj[camelCaseKey] = toCamelCase(obj[key]);
        }
    }
    return camelCasedObj;
}
function transformArrayToKey(inputArray) {
    if (Array.isArray(inputArray) && inputArray.length > 0) {
        // Get the first key in the first object
        const firstObject = inputArray[0];
        const key = Object.keys(firstObject)[0];
        // Create the output object
        const output = {};
        output[key] = inputArray.map((entry) => entry[key]);
        return output;
    }
    else {
        return {};
    }
}
const JsonConverison = {
    TransformToJson,
    TransObjKeysToCamelCase,
    toCamelCase,
    transformArrayToKey,
};
module.exports = JsonConverison;
//# sourceMappingURL=conversion.js.map