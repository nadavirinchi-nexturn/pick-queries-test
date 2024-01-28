/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require("axios");
const EBS_SECRET_MANAGER_KEY_NAME = "ebs_dev";
const DB_SOURCES = {
    EBS: "EBS",
    EBSTRANSACTION: "EBSTRANSACTION",
    EBS_READ: "EBS READ"
};
const DB_SOURCES_SECRET_KEY = {
    [DB_SOURCES.EBS]: EBS_SECRET_MANAGER_KEY_NAME,
    [DB_SOURCES.EBS_READ]: EBS_SECRET_MANAGER_KEY_NAME,
};
const prepareAfterShipAPIPayload = ({ width, height, depth, unit, weight, weight_unit }, details = {}, items = []) => {
    var _a, _b;
    console.log('details:', details);
    return {
        service_type: details.serviceType,
        shipper_account: {
            id: details.shipperAccountId
        },
        shipment: {
            ship_from: {
                contact_name: details.shipFromContact,
                company_name: details.shipFromCompanyName,
                street1: `${details.shipFromAddressLine_1}, ${details.shipFromAddressLine_2}`,
                city: details.shipFromTownOrCity,
                state: details.shipFromRegion2,
                postal_code: details.shipFromPostalCode,
                country: details.shipFromCountry,
                email: details.shipFromEmail,
                phone: details.shipFromContactNumber,
            },
            ship_to: {
                contact_name: details.shipToContact,
                company_name: details.shipToCompany,
                street1: details.shipToStreet1,
                street2: details.shipToStreet2,
                street2: details.shipToStreet3,
                city: details.shipToCity,
                state: details.shipToState,
                postal_code: details.shipToPostalCode,
                country: details.shipToCountry,
                phone: details.shipToContactNumber,
                email: details.shipToContactEmail
            },
            parcels: [
                {
                    box_type: "custom",
                    dimension: {
                        width: parseFloat(width),
                        height: parseFloat(height),
                        depth: parseFloat(depth),
                        unit
                    },
                    "items": items.map(item => {
                        var _a, _b;
                        return ({
                            "description": item.itemDescription,
                            "quantity": item.qnty,
                            "item_id": (_b = (_a = item.inventoryItemId) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
                            "price": {
                                "currency": item.currencyCode,
                                "amount": item.unitPrice
                            }
                        });
                    }),
                    "weight": { unit: weight_unit, value: parseFloat(weight) }
                }
            ]
        },
        invoice: {
            date: (_b = (_a = details.invoiceDate) === null || _a === void 0 ? void 0 : _a.split('T')) === null || _b === void 0 ? void 0 : _b[0]
        },
        file_type: "zpl",
        references: [
            details.reference1,
            details.reference2
        ]
    };
};
const hitAfterShipAPI = (data, apiKey) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            url: 'https://sandbox-api.aftership.com/postmen/v3/labels',
            headers: {
                'Content-Type': 'application/json',
                'as-api-key': apiKey
            },
            data
        };
        console.time("AfterShip Execution");
        axios.request(options).then(function (response) {
            console.timeEnd("AfterShip Execution");
            resolve(response.data);
        }).catch(function (error) {
            console.timeEnd("AfterShip Execution");
            reject(error);
        });
    });
};
const Utils = {
    EBS_SECRET_MANAGER_KEY_NAME,
    DB_SOURCES_SECRET_KEY,
    DB_SOURCES,
    prepareAfterShipAPIPayload,
    hitAfterShipAPI
};
module.exports = Utils;
//# sourceMappingURL=utils.js.map