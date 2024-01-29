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
const GRAPHQL_ENDPOINT = "https://vqwli42c7rcyzhpm6arnfq2nwy.appsync-api.us-east-1.amazonaws.com/graphql";
const GRAPHQL_API_KEY = "da2-ak4hcqmngbdyjcv4xn4a2outxe";
const query = /* GraphQL */ `
  mutation publishMessage($data: AWSJSON!, $channel: String!) {
    publish(data: $data, name: $channel) {
      data
      name
    }
  }
`;
exports.publishMessage = ({ channel = "", data = "" }) => {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        console.log(`Publishing a message via AppSync to the channel: ${channel}`);
        const variables = { data: JSON.stringify(data), channel };
        const options = {
            url: GRAPHQL_ENDPOINT,
            method: "POST",
            headers: {
                "x-api-key": GRAPHQL_API_KEY,
                "Content-Type": "application/json",
            },
            data: { query, variables },
        };
        try {
            console.time("AppSync Execution");
            yield axios(options);
            console.timeEnd("AppSync Execution");
            console.log("Sent the message to the channel: ", channel);
            resolve();
        }
        catch (error) {
            console.log("Error on publishing message:", error);
            resolve();
        }
    }));
};
//# sourceMappingURL=appSync.js.map