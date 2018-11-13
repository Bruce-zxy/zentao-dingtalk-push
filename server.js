const fs = require('fs');
const express = require('express');
const rp = require('request-promise');
const bodyParser = require('body-parser');
const tough = require('tough-cookie');
const app = express();
const cookiejar = rp.jar();


try {
    fs.accessSync(`./config.json`, fs.constants.R_OK | fs.constants.W_OK);
    const json_data = fs.readFileSync(`./config.json`).toString('utf8');
    const {
    	port, 
        phone,
        domain,
        username,
        password,
        dingtalk
    } = JSON.parse(json_data);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use('/', async(req, res, next) => {
        const {
            objectType,
            objectID,
            actor,
            date
        } = req.body;
        let session = await rp({
            uri: `${domain}/zentao/api-getsessionid.json?t=json&m=api&f=getSessionID`
        })
        let {
            sessionName,
            sessionID
        } = JSON.parse(JSON.parse(session).data);
        cookiejar.setCookie(new tough.Cookie({
            key: sessionName,
            value: sessionID
        }), domain);

        await rp({
            uri: `${domain}/zentao/user-login-L3plbnRhby8=.json?t=json&m=user&f=login&account=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
            jar: cookiejar
        })

        let tips_info = await rp({
            uri: `${domain}/zentao/${objectType}-view-${objectID}.json`,
            jar: cookiejar
        });
        let tips_info_json = JSON.parse(JSON.parse(tips_info).data);
        let users = tips_info_json.users;
        let tips_main = tips_info_json[objectType];

        let assigned_phone = phone[users[tips_main.assignedTo]];
        assigned_phone = !!assigned_phone ? assigned_phone : '';

        var options = {
            method: 'POST',
            uri: dingtalk,
            body: {
                "msgtype": "markdown",
                "markdown": {
                    "title": "【工作提醒】",
                    "text": `${req.body.text} @${assigned_phone}`
                },
                "at": {
                    "atMobiles": [
                        `${assigned_phone}`
                    ],
                    "isAtAll": false
                }
            },
            json: true
        };
        console.log(`【来自禅道的消息：】`, req.body);
        rp(options)
            .then(function(parsedBody) {
                console.log('>>>>>>>>>> 【Send to Dingtalk Successly】');
                console.log(parsedBody);
                console.log('^^^^^^^^^^ 【Send to Dingtalk Successly】');
                res.send(parsedBody) && next();
            })
            .catch(function(err) {
                console.log('>>>>>>>>>> 【Send to Dingtalk Error！！！】');
                console.log(err.message);
                console.log('^^^^^^^^^^ 【Send to Dingtalk Error！！！】');
                res.send(err.message) && next();
            });
    });

    var server = app.listen(port, function() {
        var host = server.address().address
        var port = server.address().port
        console.log(`Server start successfully on http://${host}:${port}`)
    })

} catch (err) {
    console.error(err.message);
}