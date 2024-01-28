/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-var-requires */
const Redis = require('ioredis');

const REDIS_DATA_TYPES = { STRING: "string", LIST: "list" }

async function SaveData({ keyName = '', data = '', dataType = REDIS_DATA_TYPES.STRING }) {
    return new Promise(async (resolve, reject) => {
        try {
            // Initiating redis instance
           const redis = new Redis({
                host: 'master.ebs-redis-cluster.m5wbzs.use1.cache.amazonaws.com',
                tls:{}
            })

            let res;

            switch (dataType) {
                case REDIS_DATA_TYPES.LIST:
                    let pushArray: any = [];
                    for (const item of data) {
                        pushArray.push(redis.lpush(keyName, JSON.stringify(item)));
                    }
                    res = await Promise.all(pushArray).then(res => {
                        console.log("Cached response in the key: ", keyName);
                    }).catch(err => {
                        console.log("Error: ", err);
                    });
                    break;

                case REDIS_DATA_TYPES.STRING:
                    res = await redis.set(keyName, JSON.stringify(data));
                    break;

                default:
                    res = await redis.set(keyName, JSON.stringify(data));
                    break;
            }

            resolve(res);
        } catch (error) {
            console.log('Error on saving the data to redi:', error);
            reject(error);
        }
    })
}

async function GetData({ keyName = '', dataType = REDIS_DATA_TYPES.STRING, options = {} }) {
    return new Promise(async (resolve, reject) => {
        try {
            // Initiating redis
            const redis = new Redis({
                host: 'master.ebs-redis-cluster.m5wbzs.use1.cache.amazonaws.com',
                tls:{}
            })

            let cachedData;

            switch (dataType) {
                case REDIS_DATA_TYPES.STRING:
                    console.time("RedisTime STRING");
                    cachedData = await redis.get(keyName);
                    console.timeEnd("RedisTime STRING");
                    cachedData = cachedData ? JSON.parse(cachedData) : null;
                    break;

                case REDIS_DATA_TYPES.LIST:
                    console.time("RedisTime LIST");
                    cachedData = await redis.lrange(keyName, 0, -1);
                    console.timeEnd("RedisTime LIST");
                    cachedData = cachedData.length > 0 ? cachedData.map(_ => JSON.parse(_)) : null;
                    break;
                    
                default:
                    console.time("RedisTime DEFAULT");
                    cachedData = await redis.get(keyName);
                    console.timeEnd("RedisTime DEFAULT");
                    cachedData = cachedData ? JSON.parse(cachedData) : null;
                    break;
            }

            resolve(cachedData);
        } catch (error) {
            console.log('Error on fetching data from redis:', error);
            reject(error);
        }
    })
}


module.exports = {
    SaveData,
    GetData,
    REDIS_DATA_TYPES
};
