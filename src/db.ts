/* eslint-disable @typescript-eslint/no-var-requires */
const oracledb = require("oracledb");
const Secrets = require("./secrets");
const JsonConverison = require("./conversion");
const Utils = require("./utils");
const { GetData, REDIS_DATA_TYPES, SaveData } = require("./redis");

async function ExecuteSqlQuery(
  source,
  query,
  variables = {},
  skipTransform = false,
  cache = { useCache: false, keyName: "", dataType: REDIS_DATA_TYPES.STRING },
  options = { commitQuery: false }
) {
  let connection;
  let result;

  // Checking in redis cache
  if (cache.useCache && cache.keyName) {
    try {
      result = await GetData({
        keyName: cache.keyName,
        dataType: cache.dataType,
      });
      if (result) {
        return result;
      }
    } catch (error) {
      console.log("Error on fetching data from redis:", error);
    }
  }

  try {
    // Getting the DB credentials from secret manager
    const scrt = await Secrets.getSecret(Utils.DB_SOURCES_SECRET_KEY[source]);

    // DB Connection Object
    const dbConfig = {
      user: scrt?.apps_usr,
      password: scrt?.apps_pwd,
      connectString: scrt?.host + ":" + scrt?.port + "/" + scrt?.dbname,
      connectTimeout: 27000, // Set the connection timeout to 5 seconds (adjust as needed)
    };

    switch (source) {
      case Utils.DB_SOURCES.EBS:
        // Getting the connection
        connection = await oracledb.getConnection(dbConfig);
        oracledb.fetchAsString = [oracledb.CLOB];

        // Executing query
        console.log("query:", query);
        console.log("variables:", variables);
        console.time("QueryExecutionTimeEBS");
        result = await connection.execute(query, variables);
        console.timeEnd("QueryExecutionTimeEBS");

        if (options.commitQuery) {
          await connection.commit();
        }
        break;

      case Utils.DB_SOURCES.EBS_READ:
        // Getting the connection
        connection = await oracledb.getConnection(dbConfig);
        oracledb.fetchAsString = [oracledb.CLOB];

        // Executing query
        console.log("query:", query);
        console.log("variables:", variables);
        console.time("QueryExecutionTime EBS_READ");
        result = await connection.execute(query, variables);
        console.timeEnd("QueryExecutionTime EBS_READ");

        if (options.commitQuery) {
          await connection.commit();
        }
        break;

      default:
        break;
    }

    if (!skipTransform) {
      result = await JsonConverison.TransformToJson(result);
      result = await JsonConverison.TransObjKeysToCamelCase(result);
    }

    if (cache.useCache) {
      try {
        await SaveData({
          keyName: cache.keyName,
          data: result,
          dataType: cache.dataType,
        });
      } catch (error) {
        console.log("Error on saving the data to redis:", error);
      }
    }

    return result;
  } catch (error) {
    console.log("error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Database error" }),
    };
  } finally {
    if (connection) {
      connection.close();
    }
  }
}

const Db = {
  ExecuteSqlQuery,
};

module.exports = Db;
