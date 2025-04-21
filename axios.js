import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
let { Authorization, Cookie } = process.env;
axios.defaults.headers = {
  Authorization,
  Cookie,
  Pragma: "no-cache",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
  "Content-Type": "application/x-www-form-urlencoded",
};
axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.log(error.data);
    return Promise.reject(error.data);
  }
);

export default axios;
