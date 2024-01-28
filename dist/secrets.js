var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const axios = require("axios");
function getSecret(secretName) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // Set the headers
        const url = `http://localhost:2773/secretsmanager/get?secretId=${encodeURIComponent(secretName)}`;
        // Set the headers
        const headers = {
            "Content-Type": "application/json",
            "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
        };
        try {
            let dbConObj;
            let isLocal = false;
            if (!isLocal) {
                const response = yield axios.get(url, { headers });
                dbConObj = JSON.parse((_a = response === null || response === void 0 ? void 0 : response.data) === null || _a === void 0 ? void 0 : _a.SecretString);
            }
            else {
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
        }
        catch (error) {
            console.error("Error while getting the secret:", error);
            throw error;
        }
    });
}
const Secrets = {
    getSecret,
};
module.exports = Secrets;
//# sourceMappingURL=secrets.js.map