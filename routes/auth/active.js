import { Router } from "express";
import { getClientIp } from "request-ip";
import { db_error } from "../../app";
import moment from "moment";
import loadRegex from "../coms/loadRegex";
import authLog from "../../models/authlog";
import Token from "../../models/token";
import User from "../../models/user";

const router = Router();
router.get ("/", async (req,res) => {
    var _response = { "result" : { "statusCode" : 500, "body" : {"msg":"ERR_SERVER_FAILED_TEMPORARILY"}, "output" : null, "error" : "SERVER_RESPONSE_INVALID" }};
    const responseFunction = (statusCode, body, output, error) => {
        if (!(statusCode && body && output !== undefined)) throw("ERR_SERVER_BACKEND_SYNTAX_FAILED");
        if (!(error === undefined || error === null)) console.error(error);
        _response.result.statusCode = statusCode;
        _response.result.body = body;
        _response.result.output = output;
        _response.result.error = error;
        res.status(statusCode).json(_response);
    };
    
    //#CHECK DATABASE AND WHETHER PROVIDED POST DATA IS VALID
    if (!(db_error === null)) return await responseFunction(500, {"msg":"ERR_DATABASE_NOT_CONNECTED"}, null);
    
    const { emailchk } = await loadRegex();
    const { email, token } = req.query;
    if (!(email && token)) return await responseFunction(412, {"msg":"ERR_DATA_NOT_PROVIDED"}, null);
    if (!(emailchk.test(email))) return await responseFunction(412, {"msg":"ERR_DATA_FORMAT_INVALID"}, null);

    //#FIND USER ON DATABASE USING EMAIL
    const _user = await User.findOne({"email" : email, "enable" : false});
    if (_user === null || _user === undefined) return await responseFunction(409, {"msg":"ERR_USER_NOT_FOUND"}, null);

    //#CHECK WHETHER TOKEN IS VALID
    const _token = await Token.findOne({"owner" : email, "type" : "SIGNUP" , "token" : token });
    if (!_token) return await responseFunction(409, "ERR_PROVIDED_TOKEN_INVALID", null);
    else if (Date.parse(_token.expired) < moment()) return await responseFunction(409, "ERR_PROVIDED_TOKEN_INVALID", null);
    
    //#SAVE LOG FUNCTION
    const SAVE_LOG = async (_response) => {
        const createLog = new authLog ({
            timestamp : moment().format("YYYY-MM-DD HH:mm:ss"), 
            causedby : email,
            originip : getClientIp(req),
            category : "ACTIVATE",
            details : _token,
            result : _response.result
        });
        await createLog.save(async (err) => {
            if (err) console.error(err);
        });
    };  

    //#CHANGE USER ENABLE STATE
    const _verify = await User.updateOne({"email" : email , "enable" : false }, {"enable" : true});
    if (!_verify) {
        await responseFunction(500, {"msg":"ERR_USER_UPDATE_FAILED"}, null, _verify);
        return SAVE_LOG(_response);
    }

    //#ALL TASK FINISHED, DELETE TOKENS AND SHOW OUTPUT
    await Token.deleteOne({"owner" : email, "type" : "SIGNUP", "token" : token});
    await responseFunction(200, {"msg":"SUCCEED_USER_ACTIVATED"}, null);
    return SAVE_LOG(_response);

    //handle HTML File

});


export default router;