'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');

const FILE_BASE = './data/password/';
//const NOTIFICATION_SUBJECT = "mailto:test@test.com";
const NOTIFICATION_SUBJECT = "http://test.com";

const webpush = require('web-push');
const fs = require('fs').promises;
//const uuidv4 = require('uuid/v4');
const uuidv4 = require('uuid').v4;

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	var apikey = event.requestContext.apikeyAuth.apikey;
	if( !checkAlnum(apikey) )
		throw 'apikey invalid';

	var pwd = await readPasswordFile(apikey);

	if( event.path == '/pwd-get-pubkey' ){
		var uuid = uuidv4();
		return new Response({ result: { vapidkey: pwd.vapidkey.publicKey, client_id: uuid } });
	}else
	if( event.path == '/pwd-put-object' ){
		pwd.objects[body.client_id] = body.object;
		await writePasswordFile(apikey, pwd);

		await sendNotification(pwd.vapidkey, pwd.objects[body.client_id], { title: "パスワードマネージャ", body: "通知を登録しました。"} );

		return new Response({});
	}else
	if( event.path == '/pwd-delete-object' ){
		var object = pwd.objects[body.client_id];
		delete pwd.objects[body.client_id];
		await writePasswordFile(apikey, pwd);

		return new Response({});
	}else
	if( event.path == '/pwd-get' ){
		var item;
		if( body.name ) item = pwd.list.find(item => item.name == body.name );
		else if( body.uuid ) item = pwd.list.find(item => item.uuid == body.uuid );
		else throw "invalid param";
		if( !item )
			throw 'item not found';

		return new Response({ result: item });
	}else
	if( event.path == '/pwd-list' ){
		var list = [];
		pwd.list.forEach(item => list.push({ uuid: item.uuid, name: item.name, url: item.url, userid: item.userid } ));
		return new Response({ result: list });
	}else
	if( event.path == '/pwd-insert' ){
		if( !body.name )
			throw "invalid name";

		var uuid = uuidv4();
		pwd.list.push({ uuid: uuid, name: body.name, url: body.url, userid: body.userid, password: body.password });

		await writePasswordFile(apikey, pwd);
		return new Response({});
	}else
	if( event.path == '/pwd-update' ){
		var item;
		if( body.uuid )
			item = pwd.list.find(item => item.uuid == body.uuid );
		else if( body.name )
			item = pwd.list.find(item => item.name == body.name );
		else throw 'invalid param';

		if( !item )
			throw 'item not found';

		if( body.uuid ){
			if( body.name !== undefined ) item.name = body.name;
		}
		if( body.url !== undefined ) item.url = body.url;
		if( body.userid !== undefined ) item.userid = body.userid;
		if( body.password !== undefined ) item.password = body.password;

		await writePasswordFile(apikey, pwd);

		var keys = Object.keys(pwd.objects);
		for( var i = 0 ; i < keys.length ; i++ ){
			try{
				await sendNotification( pwd.vapidkey, pwd.objects[keys[i]], { title: "パスワードマネージャ", body: item.name + "のパスワード情報が変更されました。" } );
			}catch(error){
				console.error(error);
			}
		}

		return new Response({});
	}else
	if( event.path == '/pwd-delete' ){
		var index = -1;
		if( body.uuid ) index = pwd.list.findIndex(item => item.uuid == body.uuid );
		else if( body.name ) index = pwd.list.findIndex(item => item.name == body.name );
		else throw 'invalid param';

		if( index < 0 )
			throw 'item not found';

		pwd.list.splice(index, 1);

		await writePasswordFile(apikey, pwd);
		return new Response({});
	}
};

function checkAlnum(str){
	var ret =  str.match(/([a-z]|[A-Z]|[0-9])/gi);
	return (ret.length == str.length )
}

async function readPasswordFile(apikey){
	try{
		var pwd = await fs.readFile(FILE_BASE + apikey + '.json', 'utf8');
		if( !pwd ){
			pwd = {
				vapidkey : webpush.generateVAPIDKeys(),
				list: [],
				objects: {}		
			};
			await writePasswordFile(apikey, pwd);
		}else{
			pwd = JSON.parse(pwd);
		}
		return pwd;
	}catch(error){
		throw "not found";
	}
}

async function writePasswordFile(apikey, pwd){
	await fs.writeFile(FILE_BASE + apikey + '.json', JSON.stringify(pwd, null, 2), 'utf8');
}

async function sendNotification(vapidkey, object, content){
	var options = {
		vapidDetails: {
			subject: NOTIFICATION_SUBJECT,
			publicKey: vapidkey.publicKey,
			privateKey: vapidkey.privateKey
		}
	};
	var result = await webpush.sendNotification(object, Buffer.from(JSON.stringify(content)), options);
	if( result.statusCode != 201 )
		throw "status is not 201";
}
