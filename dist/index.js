var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
const Db = require("./db");
const { publishMessage } = require("./appSync");
const utils = require("./utils");
const PickQueries = require('./pickqueries');
/**
 * Author: Surendra
 * @param {*} inventoryOrgId
 * @param {*} username
 * @param {*} source
 * @returns count of all the summary
 */
function testFunc() {
    return 'test function invoked successfully';
}
function Dashboard(invOrgId, username, source = utils.DB_SOURCES.EBS) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Dashboard Query Time");
            const data = yield Db.ExecuteSqlQuery(source, PickQueries.Dashboard(), [
                username,
                username,
                invOrgId,
            ]);
            console.timeEnd("Dashboard Query Time");
            return (_a = data === null || data === void 0 ? void 0 : data[0]) !== null && _a !== void 0 ? _a : {};
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Author: Surendra
 * Date:10-Oct-2023
 * JIRA - AM 213
 * Updated: 19-Oct-2023
 * @param {*} username
 * @param {*} inventoryOrgId
 * @returns
 */
function PickList(username, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick List Query Time");
            const result = yield Db.ExecuteSqlQuery(source, PickQueries.List(username, inventoryOrgId));
            console.timeEnd("Pick List Query Time");
            return result;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Author: Surendra
 * JIRA - AM214
 * Date:10-Oct-2023
 * Updated: 19-Oct-2023
 * @param {*} username
 * @param {*} searchLookupType
 * @param {*} searchValue
 * @param {*} inventoryOrgId
 * @returns
 */
function Search(username, searchLookupType, searchValue, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Search Query Time");
            const result = yield Db.ExecuteSqlQuery(source, PickQueries.Search(username, searchLookupType, searchValue, inventoryOrgId));
            console.timeEnd("Pick Search Query Time");
            return result;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Author: Surendra
 * JIRA - AM214
 * Date:11-Oct-2023
 * Updated: 19-Oct-2023
 * @param {*} username
 * @param {*} input1
 * @param {*} input2
 * @param {*} input3
 * @param {*} inventoryOrgId
 * @returns
 */
function Filter(username, input1, input2, input3, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Filter Query Time");
            const filterResult = yield Db.ExecuteSqlQuery(source, PickQueries.Filter(username, input1, input2, input3, inventoryOrgId));
            console.timeEnd("Pick Filter Query Time");
            return filterResult;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function SearchBySalesOrder(sonumber, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Search By Sales Order Query Time");
            const soResult = Db.ExecuteSqlQuery(source, PickQueries.SearchBySalesOrder(sonumber, inventoryOrgId));
            console.timeEnd("Pick Search By Sales Order Query Time");
            return soResult;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function SearchByItemDescription(itemDescription, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Search By Item Desc Query Time");
            const itemDescResult = yield Db.ExecuteSqlQuery(source, PickQueries.SearchByItemDescription(itemDescription, inventoryOrgId));
            console.timeEnd("Pick Search By Item Desc Query Time");
            return itemDescResult;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function SearchByDeliveryId(deliveryId, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Search By Delivery Query Time");
            const srchByDeliveryResult = yield Db.ExecuteSqlQuery(source, PickQueries.SearchByDeliveryId(deliveryId, inventoryOrgId));
            console.timeEnd("Pick Search By Delivery Query Time");
            return srchByDeliveryResult;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function SearchByDemandType(demandType, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.time("Pick Search By DT Query Time");
            const resultDT = yield Db.ExecuteSqlQuery(source, PickQueries.SearchByDemandType(demandType));
            console.timeEnd("Pick Search By DT Query Time");
            return resultDT;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
const Pick = {
    PickList,
    Search,
    Filter,
    SearchBySalesOrder,
    SearchByItemDescription,
    SearchByDeliveryId,
    SearchByDemandType,
    Dashboard,
};
module.exports = Pick;
/**
 *  Author: surendra
 * Created on 18-Oct-2023
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @returns count of SO lines and Requested quantity
 */
function CountBasedonDeliveryId(deliveryId, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.CountBasedonDeliveryId(deliveryId, inventoryOrgId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Author: surendra
 * Created on 18-Oct-2023
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @returns SO details based  the inventory and delivery number
 */
function DeliveryDetails(deliveryId, inventoryOrgId, username, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.DeliveryDetails(deliveryId, inventoryOrgId, username));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Author: surendra
 * Created on 18-Oct-2023
 * @param {*} deliveryId
 * @param {*} inventoryOrgId
 * @param {*} itemDesc
 * @returns SO details based on the Itemdesc mapping to the inventory and delivery number
 */
function Search(deliveryId, inventoryOrgId, itemDesc, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.Search(inventoryOrgId, deliveryId, itemDesc));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} soLineId
 * @param {*} source
 * @returns
 */
function SourceSubInventoryDetails(inventoryOrgId, transactionTempId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.SourceSubInventoryDetails(inventoryOrgId, transactionTempId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} source
 * @returns
 */
function DestinationSubInventoryDetails(inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.DestinationSubInventoryDetails(inventoryOrgId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} subinventory
 * @param {*} palletVal
 * @param {*} source
 * @returns
 */
function PalleteLOV(inventoryOrgCode, palletVal, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.PalleteLOV(inventoryOrgCode, palletVal));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * CageLOV
 * @param {*} inventoryOrgId
 * @param {*} subinventory
 * @param {*} palletVal
 * @param {*} cageVal
 * @param {*} source
 * @returns
 */
function CageLOV(inventoryOrgCode, palletVal, cageVal, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.CageLOV(inventoryOrgCode, palletVal, cageVal));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Tote LoV
 * @param {*} inventoryOrgId
 * @param {*} subinventory
 * @param {*} palletVal
 * @param {*} cageVal
 * @param {*} toteVal
 * @param {*} source
 * @returns
 */
function ToteLOV(inventoryOrgCode, palletVal, cageVal, toteVal, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.ToteLOV(inventoryOrgCode, palletVal, cageVal, toteVal));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Lookup for Pallet, Cage & Tote
 * @param {*} inventoryOrgId
 * @param {*} palletVal
 * @param {*} cageVal
 * @param {*} toteVal
 * @param {*} source
 * @returns
 */
function PickupLookupPalletCageTote(inventoryOrgCode, palletVal, cageVal, toteVal, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.PickupLookupPalletCageTote(inventoryOrgCode, palletVal, cageVal, toteVal), {}, false, {
                useCache: false,
                keyName: `pickupLookUp-${inventoryOrgCode}${palletVal ? `-${palletVal}` : ""}${cageVal ? `-${cageVal}` : ``}${toteVal ? `-${toteVal}` : ``}`,
                dataType: "string",
            });
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} soNumber
 * @param {*} source
 * @returns
 */
function GetLinesCountBasedOnSO(inventoryOrgId, soNumber, soLineId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.GetLinesCountBasedOnSO(inventoryOrgId, soNumber, soLineId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} soNumber
 * @param {*} source
 * @returns
 */
function GetSoLinesDetails(inventoryOrgId, soNumber, soLineId, transactionTempId, deliveryId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.GetSoLinesDetails(inventoryOrgId, soNumber, soLineId, transactionTempId, deliveryId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @returns
 */
function UpdateAutoPopulateFullPickQty(inventoryOrgId, deliveryId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.UpdateAutoPopulateFullPickQty(inventoryOrgId, deliveryId), {}, true, {}, { commitQuery: true });
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function publishCheckoutUndoCheckoutMessage({ username, inventoryOrgId, deliveryId, isCheckedOut, }) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("Getting updated list");
        let [updatedList, updatedItem] = yield Promise.all([
            Pick.PickList(username, inventoryOrgId),
            Pick.Search(username, "D", deliveryId.toString(), inventoryOrgId),
        ]);
        updatedList = updatedList === null || updatedList === void 0 ? void 0 : updatedList.filter((_) => _.seq !== 1);
        console.log("Got and filtered the updatedlist");
        yield publishMessage({
            channel: `${inventoryOrgId}-delivery-checkout`,
            data: {
                updatedItem: Object.assign({ isCheckedOut, modifiedBy: username }, ((_a = updatedItem === null || updatedItem === void 0 ? void 0 : updatedItem[0]) !== null && _a !== void 0 ? _a : {})),
                updatedList,
            },
        });
        resolve();
    }));
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @returns
 */
function UpdateLockDeliveryQuery(deliveryId, username, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield Db.ExecuteSqlQuery(source, PickQueries.UpdateLockDeliveryQuery(deliveryId, username), {}, true, {}, { commitQuery: true });
            if (result.rowsAffected === 1) {
                yield publishCheckoutUndoCheckoutMessage({
                    username,
                    inventoryOrgId,
                    deliveryId,
                    isCheckedOut: true,
                });
            }
            return result;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function UpdateUnLockDeliveryQuery(deliveryId, username, inventoryOrgId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield Db.ExecuteSqlQuery(source, PickQueries.UpdateUnLockDeliveryQuery(deliveryId, username), {}, true, {}, { commitQuery: true });
            if (result.rowsAffected === 1) {
                yield publishCheckoutUndoCheckoutMessage({
                    username,
                    inventoryOrgId,
                    deliveryId,
                    isCheckedOut: false,
                });
            }
            return result;
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} inventoryOrgId
 * @param {*} deliveryId
 * @returns
 */
function ExceptionList(source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.ExceptionList(), {}, false, {
                useCache: true,
                keyName: "exception-lists",
                dataType: "list",
            });
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 *
 * @param {*} mvOrderLineId
 * @param {*} source
 * @returns
 */
function GetSavedSOLineDetailsByMVOrderLine(mvOrderLineId, transactionTempId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.GetSavedSOLineDetails(mvOrderLineId, transactionTempId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
function GetSerialNumbers(inventoryOrgId, soNumber, soLineId, transactionTempId, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.GetSerialNumbers(inventoryOrgId, soNumber, soLineId, transactionTempId));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
/**
 * Check Is Serial Number Scanned
 * @param {*} transactionTempId
 * @param {*} serialNo
 * @returns  Scanned or not
 */
function IsSerialNumberScanned(transactionTempId, serialNo, source = utils.DB_SOURCES.EBS) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Db.ExecuteSqlQuery(source, PickQueries.IsSerialNumberScanned(transactionTempId, serialNo));
        }
        catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" + error }),
            };
        }
    });
}
module.exports = {
    testFunc,
    CountBasedonDeliveryId,
    DeliveryDetails,
    Search,
    SourceSubInventoryDetails,
    DestinationSubInventoryDetails,
    PalleteLOV,
    CageLOV,
    ToteLOV,
    GetLinesCountBasedOnSO,
    GetSoLinesDetails,
    UpdateAutoPopulateFullPickQty,
    PickupLookupPalletCageTote,
    UpdateLockDeliveryQuery,
    ExceptionList,
    GetSavedSOLineDetailsByMVOrderLine,
    UpdateUnLockDeliveryQuery,
    GetSerialNumbers,
    IsSerialNumberScanned,
};
//# sourceMappingURL=index.js.map