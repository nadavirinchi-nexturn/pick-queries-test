var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* eslint-disable @typescript-eslint/no-var-requires */
const oracledb = require("oracledb");
const Secrets = require("./secrets");
const JsonConverison = require("./conversion");
const Utils = require("./utils");
const { GetData, REDIS_DATA_TYPES, SaveData } = require("./redis");
function ExecuteSqlQuery(source, query, variables = {}, skipTransform = false, cache = { useCache: false, keyName: "", dataType: REDIS_DATA_TYPES.STRING }, options = { commitQuery: false }) {
    return __awaiter(this, void 0, void 0, function* () {
        let connection;
        let result;
        // Checking in redis cache
        if (cache.useCache && cache.keyName) {
            try {
                result = yield GetData({
                    keyName: cache.keyName,
                    dataType: cache.dataType,
                });
                if (result) {
                    return result;
                }
            }
            catch (error) {
                console.log("Error on fetching data from redis:", error);
            }
        }
        try {
            // Getting the DB credentials from secret manager
            const scrt = yield Secrets.getSecret(Utils.DB_SOURCES_SECRET_KEY[source]);
            // DB Connection Object
            const dbConfig = {
                user: scrt === null || scrt === void 0 ? void 0 : scrt.apps_usr,
                password: scrt === null || scrt === void 0 ? void 0 : scrt.apps_pwd,
                connectString: (scrt === null || scrt === void 0 ? void 0 : scrt.host) + ":" + (scrt === null || scrt === void 0 ? void 0 : scrt.port) + "/" + (scrt === null || scrt === void 0 ? void 0 : scrt.dbname),
                connectTimeout: 27000, // Set the connection timeout to 5 seconds (adjust as needed)
            };
            switch (source) {
                case Utils.DB_SOURCES.EBS:
                    // Getting the connection
                    connection = yield oracledb.getConnection(dbConfig);
                    oracledb.fetchAsString = [oracledb.CLOB];
                    // Executing query
                    console.log("query:", query);
                    console.log("variables:", variables);
                    console.time("QueryExecutionTimeEBS");
                    result = yield connection.execute(query, variables);
                    console.timeEnd("QueryExecutionTimeEBS");
                    if (options.commitQuery) {
                        yield connection.commit();
                    }
                    break;
                case Utils.DB_SOURCES.EBS_READ:
                    // Getting the connection
                    connection = yield oracledb.getConnection(dbConfig);
                    oracledb.fetchAsString = [oracledb.CLOB];
                    // Executing query
                    console.log("query:", query);
                    console.log("variables:", variables);
                    console.time("QueryExecutionTime EBS_READ");
                    result = yield connection.execute(query, variables);
                    console.timeEnd("QueryExecutionTime EBS_READ");
                    if (options.commitQuery) {
                        yield connection.commit();
                    }
                    break;
                default:
                    break;
            }
            if (!skipTransform) {
                result = yield JsonConverison.TransformToJson(result);
                result = yield JsonConverison.TransObjKeysToCamelCase(result);
            }
            if (cache.useCache) {
                try {
                    yield SaveData({
                        keyName: cache.keyName,
                        data: result,
                        dataType: cache.dataType,
                    });
                }
                catch (error) {
                    console.log("Error on saving the data to redis:", error);
                }
            }
            return result;
        }
        catch (error) {
            console.log("error:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Database error" }),
            };
        }
        finally {
            if (connection) {
                connection.close();
            }
        }
    });
}
const Db = {
    ExecuteSqlQuery,
};
module.exports = Db;
//# sourceMappingURL=db.js.map