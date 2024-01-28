var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-var-requires */
const Redis = require('ioredis');
const REDIS_DATA_TYPES = { STRING: "string", LIST: "list" };
function SaveData({ keyName = '', data = '', dataType = REDIS_DATA_TYPES.STRING }) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Initiating redis instance
                const redis = new Redis({
                    host: 'master.ebs-redis-cluster.m5wbzs.use1.cache.amazonaws.com',
                    tls: {}
                });
                let res;
                switch (dataType) {
                    case REDIS_DATA_TYPES.LIST:
                        let pushArray = [];
                        for (const item of data) {
                            pushArray.push(redis.lpush(keyName, JSON.stringify(item)));
                        }
                        res = yield Promise.all(pushArray).then(res => {
                            console.log("Cached response in the key: ", keyName);
                        }).catch(err => {
                            console.log("Error: ", err);
                        });
                        break;
                    case REDIS_DATA_TYPES.STRING:
                        res = yield redis.set(keyName, JSON.stringify(data));
                        break;
                    default:
                        res = yield redis.set(keyName, JSON.stringify(data));
                        break;
                }
                resolve(res);
            }
            catch (error) {
                console.log('Error on saving the data to redi:', error);
                reject(error);
            }
        }));
    });
}
function GetData({ keyName = '', dataType = REDIS_DATA_TYPES.STRING, options = {} }) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Initiating redis
                const redis = new Redis({
                    host: 'master.ebs-redis-cluster.m5wbzs.use1.cache.amazonaws.com',
                    tls: {}
                });
                let cachedData;
                switch (dataType) {
                    case REDIS_DATA_TYPES.STRING:
                        console.time("RedisTime STRING");
                        cachedData = yield redis.get(keyName);
                        console.timeEnd("RedisTime STRING");
                        cachedData = cachedData ? JSON.parse(cachedData) : null;
                        break;
                    case REDIS_DATA_TYPES.LIST:
                        console.time("RedisTime LIST");
                        cachedData = yield redis.lrange(keyName, 0, -1);
                        console.timeEnd("RedisTime LIST");
                        cachedData = cachedData.length > 0 ? cachedData.map(_ => JSON.parse(_)) : null;
                        break;
                    default:
                        console.time("RedisTime DEFAULT");
                        cachedData = yield redis.get(keyName);
                        console.timeEnd("RedisTime DEFAULT");
                        cachedData = cachedData ? JSON.parse(cachedData) : null;
                        break;
                }
                resolve(cachedData);
            }
            catch (error) {
                console.log('Error on fetching data from redis:', error);
                reject(error);
            }
        }));
    });
}
module.exports = {
    SaveData,
    GetData,
    REDIS_DATA_TYPES
};
//# sourceMappingURL=redis.js.map