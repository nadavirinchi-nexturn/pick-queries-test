const axios = require("axios");

async function getSecret(secretName) {
  // Set the headers
  const url = `http://localhost:2773/secretsmanager/get?secretId=${encodeURIComponent(
    secretName
  )}`;

  // Set the headers
  const headers = {
    "Content-Type": "application/json",
    "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
  };

  try {
    let dbConObj;
    let isLocal = true;

    if (!isLocal) {
      const response = await axios.get(url, { headers });
      dbConObj = JSON.parse(response?.data?.SecretString);
    } else {
      dbConObj = {
        apps_usr: "apps",
        apps_pwd: "devapps",
        host: "ec2-52-2-62-212.compute-1.amazonaws.com",
        port: "1521",
        dbname: "ebs_DEV",
        connectTimeout: 27000,
      };
    }

    return dbConObj;
  } catch (error) {
    console.error("Error while getting the secret:", error);
    throw error;
  }
}

const Secrets = {
  getSecret,
};

module.exports = Secrets;
